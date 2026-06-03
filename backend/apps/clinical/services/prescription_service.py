import uuid
from datetime import datetime

from django.db import transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.clinical.constants import PrescriptionStatus
from apps.clinical.models import Prescription, PrescriptionItem
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.visits.constants import QueueStage
from apps.visits.services.visit_service import VisitService


class PrescriptionService:
    @staticmethod
    def generate_prescription_number() -> str:
        stamp = datetime.now().strftime("%Y%m%d")
        suffix = uuid.uuid4().hex[:6].upper()
        return f"RX-{stamp}-{suffix}"

    @classmethod
    @transaction.atomic
    def create_prescription(cls, *, visit, items: list[dict], notes: str, performed_by) -> Prescription:
        prescription = Prescription.objects.create(
            visit=visit,
            prescription_number=cls.generate_prescription_number(),
            notes=notes,
            performed_by=performed_by,
        )
        for item in items:
            PrescriptionItem.objects.create(
                prescription=prescription,
                performed_by=performed_by,
                **item,
            )
        VisitService.enqueue(visit=visit, stage=QueueStage.PHARMACY, performed_by=performed_by)
        AuditService.log(
            action="prescription_created",
            entity_type="prescription",
            entity_id=str(prescription.id),
            performed_by=performed_by,
            visit=visit,
        )
        NotificationService.create_notification(
            student=visit.student,
            notification_type=NotificationType.PRESCRIPTION,
            title="Prescription created",
            message="Your doctor has created a new prescription for dispensing.",
            metadata={"prescription_id": str(prescription.id)},
        )
        VisitService.recalculate_visit_status(visit, performed_by=performed_by)
        return prescription

    @classmethod
    @transaction.atomic
    def mark_dispensed(cls, prescription: Prescription, performed_by) -> Prescription:
        now = timezone.now()
        prescription.items.update(is_dispensed=True, dispensed_at=now, performed_by=performed_by)
        prescription.status = PrescriptionStatus.DISPENSED
        prescription.dispensed_at = now
        prescription.performed_by = performed_by
        prescription.save()
        AuditService.log(
            action="prescription_dispensed",
            entity_type="prescription",
            entity_id=str(prescription.id),
            performed_by=performed_by,
            visit=prescription.visit,
        )
        NotificationService.create_notification(
            student=prescription.visit.student,
            notification_type=NotificationType.PRESCRIPTION,
            title="Prescription ready",
            message="Your prescription has been dispensed and is ready for pickup.",
            metadata={"prescription_id": str(prescription.id)},
        )
        VisitService.finalize_if_ready(prescription.visit, performed_by=performed_by)
        from apps.core.realtime import RealtimeEventService

        RealtimeEventService.publish_to_staff(
            "prescription.ready",
            {
                "prescription_id": str(prescription.id),
                "visit_id": str(prescription.visit_id),
                "student": prescription.visit.student.full_name,
                "status": prescription.status,
            },
        )
        return prescription
