from datetime import datetime

from django.db.models import Q, QuerySet
from django.utils.dateparse import parse_datetime

from apps.audit.models import AuditLog


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed is not None:
        return parsed
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def filter_audit_logs(
    *,
    action: str = "",
    entity_type: str = "",
    role: str = "",
    performed_by: str = "",
    q: str = "",
    date_from: str = "",
    date_to: str = "",
) -> QuerySet[AuditLog]:
    qs = AuditLog.objects.select_related("performed_by", "visit").order_by("-created_at")

    if action:
        qs = qs.filter(action__icontains=action)
    if entity_type:
        qs = qs.filter(entity_type__icontains=entity_type)
    if role:
        qs = qs.filter(role=role)
    if performed_by:
        qs = qs.filter(performed_by__username__icontains=performed_by)
    if q:
        qs = qs.filter(
            Q(action__icontains=q)
            | Q(entity_type__icontains=q)
            | Q(entity_id__icontains=q)
            | Q(workstation_name__icontains=q)
            | Q(performed_by__username__icontains=q)
        )
    start = _parse_dt(date_from)
    end = _parse_dt(date_to)
    if start:
        qs = qs.filter(created_at__gte=start)
    if end:
        qs = qs.filter(created_at__lte=end)
    return qs


def serialize_audit_log(log: AuditLog, *, include_ip: bool = True) -> dict:
    data = {
        "id": str(log.id),
        "action": log.action,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "performed_by": log.performed_by.username if log.performed_by else None,
        "workstation_name": log.workstation_name,
        "role": log.role,
        "visit_id": str(log.visit_id) if log.visit_id else None,
        "emergency_event_id": str(log.emergency_event_id) if log.emergency_event_id else None,
        "metadata": log.metadata,
        "created_at": log.created_at,
    }
    if include_ip:
        data["ip_address"] = str(log.ip_address) if log.ip_address else None
    return data


def paginate_audit_logs(
    qs: QuerySet[AuditLog],
    *,
    offset: int = 0,
    limit: int = 50,
) -> dict:
    offset = max(0, offset)
    limit = max(1, min(limit, 200))
    total = qs.count()
    items = list(qs[offset : offset + limit])
    return {
        "items": [serialize_audit_log(log) for log in items],
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + limit < total,
    }
