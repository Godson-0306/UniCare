from django.db import transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.core.realtime import RealtimeEventService
from apps.emergency.models import EmergencyEvent, EmergencyStatus
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.visits.constants import VisitPriority
from apps.visits.services.visit_service import VisitService


class EmergencyService:
    EMERGENCY_ALERT_ROLE = "duty_officer"

    @classmethod
    @transaction.atomic
    def trigger_emergency(
        cls,
        *,
        student,
        description: str,
        latitude=None,
        longitude=None,
        location_label: str = "",
        performed_by=None,
    ) -> EmergencyEvent:
        visit = VisitService.create_visit(
            student=student,
            chief_complaint=description or "Emergency assistance requested",
            reception_notes="Emergency bypass",
            performed_by=performed_by,
            is_emergency=True,
            priority=VisitPriority.EMERGENCY,
        )
        event = EmergencyEvent.objects.create(
            student=student,
            visit=visit,
            description=description,
            latitude=latitude,
            longitude=longitude,
            location_label=location_label,
            dial_triggered=True,
            dial_triggered_at=timezone.now(),
            performed_by=performed_by,
        )
        NotificationService.create_notification(
            student=student,
            notification_type=NotificationType.EMERGENCY,
            title="Emergency alert triggered",
            message="Emergency assistance has been activated. Help is on the way.",
            metadata={"emergency_id": str(event.id)},
        )
        AuditService.log(
            action="emergency_triggered",
            entity_type="emergency",
            entity_id=str(event.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"dial_triggered": True},
            emergency_event=event,
        )
        payload = {
            "id": str(event.id),
            "status": event.status,
            "student": student.full_name,
            "matric_number": student.matric_number,
            "description": event.description,
            "location_label": event.location_label,
            "latitude": float(event.latitude) if event.latitude is not None else None,
            "longitude": float(event.longitude) if event.longitude is not None else None,
            "visit_id": str(event.visit_id) if event.visit_id else None,
            "created_at": event.created_at.isoformat(),
        }
        RealtimeEventService.publish_to_role(cls.EMERGENCY_ALERT_ROLE, "emergency.triggered", payload)
        RealtimeEventService.publish_to_staff("emergency.triggered", payload)
        return event

    @classmethod
    def resolve(cls, event: EmergencyEvent, performed_by) -> EmergencyEvent:
        event.status = EmergencyStatus.RESOLVED
        event.resolved_at = timezone.now()
        event.performed_by = performed_by
        event.save()
        AuditService.log(
            action="emergency_resolved",
            entity_type="emergency",
            entity_id=str(event.id),
            performed_by=performed_by,
            visit=event.visit,
            emergency_event=event,
        )
        payload = {
            "id": str(event.id),
            "status": event.status,
            "resolved_at": event.resolved_at.isoformat() if event.resolved_at else None,
            "visit_id": str(event.visit_id) if event.visit_id else None,
        }
        RealtimeEventService.publish_to_role(cls.EMERGENCY_ALERT_ROLE, "emergency.resolved", payload)
        RealtimeEventService.publish_to_staff("emergency.resolved", payload)
        return event
