from django.db.models import Q
from django.utils.dateparse import parse_date, parse_datetime

from apps.appointments.models import Appointment
from apps.emergency.models import EmergencyEvent


def list_emergencies(*, status: str = "", q: str = "", offset: int = 0, limit: int = 50) -> dict:
    qs = EmergencyEvent.objects.select_related("student", "assigned_workstation").order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    if q:
        qs = qs.filter(
            Q(description__icontains=q)
            | Q(student__matric_number__icontains=q)
            | Q(student__first_name__icontains=q)
            | Q(student__last_name__icontains=q)
        )
    offset = max(0, offset)
    limit = max(1, min(limit, 200))
    total = qs.count()
    items = [
        {
            "id": str(e.id),
            "status": e.status,
            "student": e.student.full_name,
            "matric_number": e.student.matric_number,
            "description": e.description,
            "dial_triggered": e.dial_triggered,
            "priority_override": e.priority_override,
            "assigned_workstation": e.assigned_workstation.station_name if e.assigned_workstation else None,
            "assigned_at": e.assigned_at,
            "resolved_at": e.resolved_at,
            "created_at": e.created_at,
        }
        for e in qs[offset : offset + limit]
    ]
    return {"items": items, "total": total, "offset": offset, "limit": limit, "has_more": offset + limit < total}


def list_appointments(
    *,
    status: str = "",
    q: str = "",
    date_from: str = "",
    date_to: str = "",
    offset: int = 0,
    limit: int = 50,
) -> dict:
    qs = Appointment.objects.select_related("student", "visit", "performed_by").order_by("-scheduled_at")
    if status:
        qs = qs.filter(status=status)
    if q:
        qs = qs.filter(
            Q(title__icontains=q)
            | Q(department__icontains=q)
            | Q(student__matric_number__icontains=q)
            | Q(student__first_name__icontains=q)
            | Q(student__last_name__icontains=q)
        )
    start = parse_datetime(date_from) if date_from else None
    if date_from and start is None:
        d = parse_date(date_from)
        if d:
            from datetime import datetime, time

            from django.utils import timezone

            start = timezone.make_aware(datetime.combine(d, time.min))
    end = parse_datetime(date_to) if date_to else None
    if date_to and end is None:
        d = parse_date(date_to)
        if d:
            from datetime import datetime, time

            from django.utils import timezone

            end = timezone.make_aware(datetime.combine(d, time.max))
    if start:
        qs = qs.filter(scheduled_at__gte=start)
    if end:
        qs = qs.filter(scheduled_at__lte=end)

    offset = max(0, offset)
    limit = max(1, min(limit, 200))
    total = qs.count()
    items = [
        {
            "id": str(a.id),
            "title": a.title,
            "department": a.department,
            "scheduled_at": a.scheduled_at,
            "status": a.status,
            "notes": a.notes,
            "student_name": a.student.full_name,
            "matric_number": a.student.matric_number,
            "visit_number": a.visit.visit_number if a.visit else None,
            "created_by": a.performed_by.username if a.performed_by else None,
            "reminder_sent": a.reminder_sent,
            "created_at": a.created_at,
            "updated_at": a.updated_at,
        }
        for a in qs[offset : offset + limit]
    ]
    return {"items": items, "total": total, "offset": offset, "limit": limit, "has_more": offset + limit < total}
