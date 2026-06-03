from django.db import transaction
from django.db.models import Q

from apps.appointments.models import Appointment, AppointmentStatus
from apps.audit.services import AuditService
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService


class AppointmentService:
    @classmethod
    @transaction.atomic
    def create_reception_appointment(
        cls,
        *,
        student,
        title: str,
        department: str,
        scheduled_at,
        notes: str,
        performed_by,
        visit=None,
        status: str = AppointmentStatus.SCHEDULED,
    ) -> Appointment:
        appointment = Appointment.objects.create(
            student=student,
            visit=visit,
            title=title,
            department=department,
            scheduled_at=scheduled_at,
            notes=notes,
            performed_by=performed_by,
            status=status,
        )
        NotificationService.create_notification(
            student=student,
            notification_type=NotificationType.APPOINTMENT,
            title="Appointment scheduled",
            message=f"Your appointment '{title}' has been scheduled.",
            metadata={"appointment_id": str(appointment.id), "visit_id": str(visit.id) if visit else None},
        )
        AuditService.log(
            action="appointment_created",
            entity_type="appointment",
            entity_id=str(appointment.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"student_id": str(student.id), "status": status},
        )
        return appointment

    @classmethod
    @transaction.atomic
    def create_follow_up(
        cls,
        *,
        visit,
        title: str,
        scheduled_at,
        notes: str,
        performed_by,
    ) -> Appointment:
        appointment = Appointment.objects.create(
            student=visit.student,
            visit=visit,
            title=title or "Follow-up",
            scheduled_at=scheduled_at,
            notes=notes,
            performed_by=performed_by,
            status=AppointmentStatus.SCHEDULED,
        )
        NotificationService.create_notification(
            student=visit.student,
            notification_type=NotificationType.FOLLOW_UP,
            title="Follow-up scheduled",
            message=f"A follow-up appointment has been scheduled for {appointment.scheduled_at:%Y-%m-%d %H:%M}.",
            metadata={"appointment_id": str(appointment.id), "visit_id": str(visit.id)},
        )
        AuditService.log(
            action="follow_up_scheduled",
            entity_type="appointment",
            entity_id=str(appointment.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"student_id": str(visit.student_id)},
        )
        return appointment

    @classmethod
    def list_for_user(cls, *, user, status: str | None = None, search: str = ""):
        queryset = Appointment.objects.select_related("student", "visit", "performed_by").order_by("scheduled_at")
        if status:
            queryset = queryset.filter(status=status)
        if search:
            queryset = queryset.filter(
                Q(student__matric_number__icontains=search)
                | Q(student__first_name__icontains=search)
                | Q(student__last_name__icontains=search)
                | Q(title__icontains=search)
            )
        if user.role == "student":
            queryset = queryset.filter(student=user.student_profile)
        return queryset[:200]
