from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from apps.accounts.models import WorkstationAccount
from apps.admin_console.services.audit_query import serialize_audit_log
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.emergency.models import EmergencyEvent
from apps.visits.constants import QueueStatus, VisitStatus
from apps.visits.models import QueueEntry, Visit


OPEN_EMERGENCY_STATUSES = ("triggered", "dispatched")
ACTIVE_VISIT_STATUSES = (
    VisitStatus.CREATED,
    VisitStatus.IN_NURSE_QUEUE,
    VisitStatus.VITALS_RECORDED,
    VisitStatus.IN_DOCTOR_CONSULTATION,
    VisitStatus.CONSULTATION_COMPLETED,
    VisitStatus.AWAITING_LAB_RESULTS,
    VisitStatus.LAB_REQUESTED,
    VisitStatus.PHARMACY_PROCESSING,
)


def build_overview(*, online_hours: int = 8) -> dict:
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    online_since = now - timedelta(hours=online_hours)

    visits_by_status = {
        row["status"]: row["total"]
        for row in Visit.objects.filter(status__in=ACTIVE_VISIT_STATUSES)
        .values("status")
        .annotate(total=Count("id"))
    }
    queue_by_stage = {
        row["stage"]: {"waiting": 0, "in_progress": 0}
        for row in QueueEntry.objects.filter(
            status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS]
        )
        .values("stage")
        .annotate(total=Count("id"))
    }
    for row in (
        QueueEntry.objects.filter(status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS])
        .values("stage", "status")
        .annotate(total=Count("id"))
    ):
        bucket = queue_by_stage.setdefault(row["stage"], {"waiting": 0, "in_progress": 0})
        if row["status"] == QueueStatus.WAITING:
            bucket["waiting"] = row["total"]
        elif row["status"] == QueueStatus.IN_PROGRESS:
            bucket["in_progress"] = row["total"]

    open_emergencies = list(
        EmergencyEvent.objects.filter(status__in=OPEN_EMERGENCY_STATUSES)
        .select_related("student", "assigned_workstation")
        .order_by("-created_at")[:10]
    )
    todays_appointments = Appointment.objects.filter(scheduled_at__gte=today_start).count()
    workstations_online = WorkstationAccount.objects.filter(
        is_active=True, last_login_at__gte=online_since
    ).count()
    workstations_total = WorkstationAccount.objects.filter(is_active=True).count()
    recent_audit = [
        serialize_audit_log(log) for log in AuditLog.objects.select_related("performed_by").order_by("-created_at")[:10]
    ]

    return {
        "active_visits": Visit.objects.filter(status__in=ACTIVE_VISIT_STATUSES).count(),
        "visits_by_status": visits_by_status,
        "queue_by_stage": queue_by_stage,
        "open_emergencies_count": EmergencyEvent.objects.filter(status__in=OPEN_EMERGENCY_STATUSES).count(),
        "open_emergencies": [
            {
                "id": str(e.id),
                "status": e.status,
                "student": e.student.full_name,
                "matric_number": e.student.matric_number,
                "description": e.description,
                "created_at": e.created_at,
            }
            for e in open_emergencies
        ],
        "todays_appointments": todays_appointments,
        "workstations_online": workstations_online,
        "workstations_total": workstations_total,
        "recent_audit": recent_audit,
    }
