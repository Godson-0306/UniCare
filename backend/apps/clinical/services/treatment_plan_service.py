from datetime import datetime, time, timedelta

from django.db import transaction
from django.utils import timezone

from apps.appointments.services import AppointmentService
from apps.audit.services import AuditService
from apps.clinical.models import TreatmentSchedule
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.visits.services.visit_service import VisitService


class TreatmentPlanService:
    @staticmethod
    def _coerce_schedule_time(schedule_time):
        if schedule_time is None:
            return time(hour=9, minute=0)
        return schedule_time

    @classmethod
    def _build_occurrence_datetimes(
        cls,
        *,
        start_date,
        end_date=None,
        occurrences_total: int = 1,
        interval_days: int = 1,
        schedule_time=None,
    ) -> list[datetime]:
        current_date = start_date
        schedule_time = cls._coerce_schedule_time(schedule_time)
        planned: list[datetime] = []

        while len(planned) < occurrences_total:
            planned.append(datetime.combine(current_date, schedule_time, tzinfo=timezone.get_current_timezone()))
            current_date = current_date + timedelta(days=max(interval_days, 1))
            if end_date and current_date > end_date:
                break
        return planned

    @classmethod
    @transaction.atomic
    def create_plan(
        cls,
        *,
        visit,
        schedule_type: str,
        title: str,
        description: str,
        medication_name: str,
        dosage: str,
        frequency: str,
        start_date,
        end_date=None,
        occurrences_total: int = 1,
        interval_days: int = 1,
        schedule_time=None,
        reminder_offset_minutes: int = 60,
        performed_by=None,
    ) -> TreatmentSchedule:
        planned_events = cls._build_occurrence_datetimes(
            start_date=start_date,
            end_date=end_date,
            occurrences_total=occurrences_total,
            interval_days=interval_days,
            schedule_time=schedule_time,
        )
        schedule = TreatmentSchedule.objects.create(
            visit=visit,
            student=visit.student,
            schedule_type=schedule_type,
            title=title,
            description=description,
            medication_name=medication_name,
            dosage=dosage,
            frequency=frequency,
            start_date=start_date,
            end_date=end_date,
            next_due_at=planned_events[0] if planned_events else None,
            status="active",
            performed_by=performed_by,
            interval_days=interval_days,
            occurrences_total=max(len(planned_events), 1),
            appointments_generated=len(planned_events),
            reminder_offset_minutes=reminder_offset_minutes,
        )

        for due_at in planned_events:
            AppointmentService.create_follow_up(
                visit=visit,
                title=f"{title} session",
                scheduled_at=due_at,
                notes=description,
                performed_by=performed_by,
            )

        NotificationService.create_notification(
            student=visit.student,
            notification_type=NotificationType.TREATMENT,
            title="Treatment plan created",
            message=f"A structured treatment plan for '{title}' has been scheduled.",
            metadata={"treatment_schedule_id": str(schedule.id), "visit_id": str(visit.id)},
        )
        AuditService.log(
            action="treatment_plan_created",
            entity_type="treatment_schedule",
            entity_id=str(schedule.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"occurrences_total": len(planned_events), "schedule_type": schedule_type},
        )
        VisitService.recalculate_visit_status(visit, performed_by=performed_by)
        return schedule
