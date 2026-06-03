import uuid
from datetime import datetime

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import StudentProfile
from apps.audit.services import AuditService
from apps.core.realtime import RealtimeEventService
from apps.visits.constants import QueueStage, QueueStatus, VisitPriority, VisitStatus
from apps.visits.models import QueueEntry, ReceptionLog, Visit


class VisitService:
    PRIORITY_RANK = {
        VisitPriority.EMERGENCY: 0,
        VisitPriority.URGENT: 1,
        VisitPriority.NORMAL: 2,
    }

    @staticmethod
    def generate_visit_number() -> str:
        stamp = datetime.now().strftime("%Y%m%d")
        suffix = uuid.uuid4().hex[:6].upper()
        return f"V-{stamp}-{suffix}"

    @classmethod
    @transaction.atomic
    def create_visit(
        cls,
        *,
        student: StudentProfile,
        chief_complaint: str,
        reception_notes: str,
        performed_by,
        priority: str = VisitPriority.NORMAL,
        is_emergency: bool = False,
        enqueue_initial: bool = True,
    ) -> Visit:
        visit = Visit.objects.create(
            student=student,
            visit_number=cls.generate_visit_number(),
            chief_complaint=chief_complaint,
            reception_notes=reception_notes,
            performed_by=performed_by,
            priority=VisitPriority.EMERGENCY if is_emergency else priority,
            is_emergency=is_emergency,
            status=VisitStatus.CREATED,
        )
        ReceptionLog.objects.create(
            visit=visit,
            notes=reception_notes or chief_complaint,
            performed_by=performed_by,
            assigned_nurse_queue=enqueue_initial,
        )
        AuditService.log(
            action="visit_created",
            entity_type="visit",
            entity_id=str(visit.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"visit_number": visit.visit_number, "queue_bypassed": not enqueue_initial},
        )
        if enqueue_initial:
            cls.enqueue(visit=visit, stage=QueueStage.NURSE, performed_by=performed_by)
        RealtimeEventService.publish_to_staff(
            "visit.created",
            {
                "id": str(visit.id),
                "visit_number": visit.visit_number,
                "student": visit.student.full_name,
                "matric_number": visit.student.matric_number,
                "priority": visit.priority,
                "status": visit.status,
                "is_emergency": visit.is_emergency,
                "queue_bypassed": not enqueue_initial,
                "registered_at": visit.registered_at.isoformat(),
            },
        )
        return visit

    @classmethod
    def transition_status(cls, visit: Visit, status: str, *, performed_by=None, metadata: dict | None = None) -> Visit:
        if visit.status == status:
            return visit
        visit.status = status
        visit.performed_by = performed_by or visit.performed_by
        visit.save(update_fields=["status", "performed_by", "updated_at"])
        AuditService.log(
            action="visit_status_changed",
            entity_type="visit",
            entity_id=str(visit.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"status": status, **(metadata or {})},
        )
        RealtimeEventService.publish_to_staff(
            "visit.status_changed",
            {
                "visit_id": str(visit.id),
                "visit_number": visit.visit_number,
                "student": visit.student.full_name,
                "status": status,
                "priority": visit.priority,
                "metadata": metadata or {},
            },
        )
        return visit

    @classmethod
    @transaction.atomic
    def enqueue(cls, *, visit: Visit, stage: QueueStage, performed_by) -> QueueEntry:
        entry = QueueEntry.objects.create(
            visit=visit,
            stage=stage,
            status=QueueStatus.WAITING,
            position=0,
            performed_by=performed_by,
        )
        status_map = {
            QueueStage.NURSE: VisitStatus.IN_NURSE_QUEUE,
            QueueStage.DOCTOR: VisitStatus.IN_DOCTOR_CONSULTATION,
            QueueStage.PHARMACY: VisitStatus.PHARMACY_PROCESSING,
            QueueStage.LAB: VisitStatus.LAB_REQUESTED,
        }
        if stage in status_map:
            cls.transition_status(visit, status_map[stage], performed_by=performed_by, metadata={"stage": stage})
        cls.reorder_stage(stage)
        RealtimeEventService.publish_to_staff(
            "queue.updated",
            {
                "id": str(entry.id),
                "visit_id": str(visit.id),
                "visit_number": visit.visit_number,
                "student": visit.student.full_name,
                "matric_number": visit.student.matric_number,
                "stage": entry.stage,
                "status": entry.status,
                "position": entry.position,
                "priority": visit.priority,
                "is_emergency": visit.is_emergency,
            },
        )
        return entry

    @classmethod
    def reorder_stage(cls, stage: QueueStage) -> None:
        entries = list(
            QueueEntry.objects.filter(stage=stage, status=QueueStatus.WAITING)
            .select_related("visit")
            .order_by("created_at")
        )
        entries.sort(key=lambda entry: (cls.PRIORITY_RANK.get(entry.visit.priority, 99), entry.created_at))
        for idx, entry in enumerate(entries, start=1):
            if entry.position != idx:
                entry.position = idx
                entry.save(update_fields=["position"])

    @classmethod
    @transaction.atomic
    def complete_queue_entry(cls, entry: QueueEntry, performed_by, notes: str = "") -> QueueEntry:
        entry.status = QueueStatus.COMPLETED
        entry.completed_at = timezone.now()
        entry.performed_by = performed_by
        if notes:
            entry.notes = notes
        entry.save()
        cls.reorder_stage(entry.stage)
        RealtimeEventService.publish_to_staff(
            "queue.completed",
            {
                "id": str(entry.id),
                "visit_id": str(entry.visit_id),
                "stage": entry.stage,
                "status": entry.status,
                "completed_at": entry.completed_at.isoformat() if entry.completed_at else None,
            },
        )
        return entry

    @classmethod
    def start_queue_entry(cls, entry: QueueEntry, performed_by) -> QueueEntry:
        entry.status = QueueStatus.IN_PROGRESS
        entry.started_at = timezone.now()
        entry.assigned_to = performed_by
        entry.performed_by = performed_by
        entry.save(update_fields=["status", "started_at", "assigned_to", "performed_by", "updated_at"])
        RealtimeEventService.publish_to_staff(
            "queue.started",
            {
                "id": str(entry.id),
                "visit_id": str(entry.visit_id),
                "stage": entry.stage,
                "assigned_to": performed_by.username if performed_by else None,
            },
        )
        return entry

    @classmethod
    def adjust_priority(cls, visit: Visit, priority: str, performed_by, reason: str = "") -> Visit:
        visit.priority = priority
        visit.performed_by = performed_by
        visit.save(update_fields=["priority", "performed_by", "updated_at"])
        AuditService.log(
            action="visit_priority_updated",
            entity_type="visit",
            entity_id=str(visit.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"priority": priority, "reason": reason},
        )
        for stage in QueueStage.values:
            cls.reorder_stage(stage)
        RealtimeEventService.publish_to_staff(
            "queue.priority_adjusted",
            {
                "visit_id": str(visit.id),
                "visit_number": visit.visit_number,
                "priority": priority,
                "reason": reason,
            },
        )
        return cls.recalculate_visit_status(visit, performed_by=performed_by)

    @classmethod
    def recalculate_visit_status(cls, visit: Visit, *, performed_by=None) -> Visit:
        if visit.status in {VisitStatus.CANCELLED, VisitStatus.CLOSED}:
            return visit
        if visit.lab_requests.filter(status__in=["pending", "in_progress"]).exists():
            return cls.transition_status(visit, VisitStatus.LAB_REQUESTED, performed_by=performed_by)
        if visit.prescriptions.filter(status__in=["pending", "partially_dispensed"]).exists():
            return cls.transition_status(visit, VisitStatus.PHARMACY_PROCESSING, performed_by=performed_by)
        if visit.queue_entries.filter(stage=QueueStage.DOCTOR, status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS]).exists():
            return cls.transition_status(visit, VisitStatus.IN_DOCTOR_CONSULTATION, performed_by=performed_by)
        if visit.vitals_records.exists():
            return cls.transition_status(visit, VisitStatus.VITALS_RECORDED, performed_by=performed_by)
        if visit.queue_entries.filter(stage=QueueStage.NURSE, status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS]).exists():
            return cls.transition_status(visit, VisitStatus.IN_NURSE_QUEUE, performed_by=performed_by)
        if visit.completed_at:
            return cls.transition_status(visit, VisitStatus.COMPLETED, performed_by=performed_by)
        return cls.transition_status(visit, VisitStatus.COMPLETED, performed_by=performed_by)

    @classmethod
    def finalize_if_ready(cls, visit: Visit, *, performed_by=None) -> Visit:
        if (
            not visit.queue_entries.filter(status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS]).exists()
            and not visit.lab_requests.filter(status__in=["pending", "in_progress"]).exists()
            and not visit.prescriptions.filter(status__in=["pending", "partially_dispensed"]).exists()
        ):
            visit.completed_at = timezone.now()
            visit.save(update_fields=["completed_at", "updated_at"])
            cls.transition_status(visit, VisitStatus.COMPLETED, performed_by=performed_by)
        else:
            cls.recalculate_visit_status(visit, performed_by=performed_by)
        return visit

    @classmethod
    def close_visit(cls, visit: Visit, *, performed_by=None) -> Visit:
        if visit.status != VisitStatus.COMPLETED:
            cls.finalize_if_ready(visit, performed_by=performed_by)
        return cls.transition_status(visit, VisitStatus.CLOSED, performed_by=performed_by)

    @classmethod
    @transaction.atomic
    def forward_to_doctor(cls, visit: Visit, performed_by) -> QueueEntry:
        existing_doctor_entry = (
            visit.queue_entries.filter(
                stage=QueueStage.DOCTOR,
                status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
            )
            .order_by("created_at")
            .first()
        )
        if existing_doctor_entry:
            return existing_doctor_entry
        nurse_entries = visit.queue_entries.filter(
            stage=QueueStage.NURSE,
            status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
        )
        for entry in nurse_entries:
            cls.complete_queue_entry(entry, performed_by, notes="Forwarded to doctor")
        return cls.enqueue(visit=visit, stage=QueueStage.DOCTOR, performed_by=performed_by)
