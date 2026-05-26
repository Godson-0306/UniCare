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
    ) -> Visit:
        visit = Visit.objects.create(
            student=student,
            visit_number=cls.generate_visit_number(),
            chief_complaint=chief_complaint,
            reception_notes=reception_notes,
            performed_by=performed_by,
            priority=VisitPriority.EMERGENCY if is_emergency else priority,
            is_emergency=is_emergency,
            status=VisitStatus.REGISTERED,
        )
        ReceptionLog.objects.create(
            visit=visit,
            notes=reception_notes or chief_complaint,
            performed_by=performed_by,
        )
        cls.enqueue(visit=visit, stage=QueueStage.NURSE, performed_by=performed_by)
        AuditService.log(
            action="visit_created",
            entity_type="visit",
            entity_id=str(visit.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"visit_number": visit.visit_number},
        )
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
                "registered_at": visit.registered_at.isoformat(),
            },
        )
        return visit

    @classmethod
    @transaction.atomic
    def enqueue(cls, *, visit: Visit, stage: QueueStage, performed_by) -> QueueEntry:
        last_position = (
            QueueEntry.objects.filter(stage=stage, status=QueueStatus.WAITING)
            .order_by("-position")
            .values_list("position", flat=True)
            .first()
        ) or 0
        entry = QueueEntry.objects.create(
            visit=visit,
            stage=stage,
            status=QueueStatus.WAITING,
            position=last_position + 1,
            performed_by=performed_by,
        )
        status_map = {
            QueueStage.NURSE: VisitStatus.AT_NURSE,
            QueueStage.DOCTOR: VisitStatus.AT_DOCTOR,
            QueueStage.PHARMACY: VisitStatus.AWAITING_PHARMACY,
            QueueStage.LAB: VisitStatus.AWAITING_LAB,
        }
        if stage in status_map:
            visit.status = status_map[stage]
            visit.save(update_fields=["status", "updated_at"])
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
    @transaction.atomic
    def complete_queue_entry(cls, entry: QueueEntry, performed_by, notes: str = "") -> QueueEntry:
        entry.status = QueueStatus.COMPLETED
        entry.completed_at = timezone.now()
        entry.performed_by = performed_by
        if notes:
            entry.notes = notes
        entry.save()
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
    @transaction.atomic
    def forward_to_doctor(cls, visit: Visit, performed_by) -> QueueEntry:
        nurse_entries = visit.queue_entries.filter(
            stage=QueueStage.NURSE,
            status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
        )
        for entry in nurse_entries:
            cls.complete_queue_entry(entry, performed_by, notes="Forwarded to doctor")
        return cls.enqueue(visit=visit, stage=QueueStage.DOCTOR, performed_by=performed_by)
