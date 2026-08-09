import secrets
import string

from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.constants import HOSPITAL_WORKSTATION_ROLES, AccountType, Role
from apps.accounts.models import User, WorkstationAccount
from apps.audit.services import AuditService


def _temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _is_super_admin(actor: User) -> bool:
    return bool(actor.is_superuser or actor.role == Role.SUPER_ADMIN)


def serialize_workstation(station: WorkstationAccount) -> dict:
    return {
        "id": str(station.id),
        "user_id": str(station.user_id),
        "username": station.user.username,
        "station_name": station.station_name,
        "station_code": station.station_code,
        "location": station.location,
        "assigned_role": station.assigned_role,
        "is_active": station.is_active and station.user.is_active,
        "last_login_at": station.last_login_at,
        "managed_by": str(station.managed_by_id) if station.managed_by_id else None,
        "managed_by_username": station.managed_by.username if station.managed_by else None,
        "created_at": station.created_at,
        "updated_at": station.updated_at,
    }


def list_workstations(*, role: str = "", is_active: str = "", q: str = "", offset: int = 0, limit: int = 50) -> dict:
    qs = WorkstationAccount.objects.select_related("user", "managed_by").order_by("station_name")
    if role:
        qs = qs.filter(assigned_role=role)
    if is_active in ("true", "false"):
        active = is_active == "true"
        qs = qs.filter(is_active=active, user__is_active=active)
    if q:
        qs = qs.filter(
            Q(station_name__icontains=q)
            | Q(station_code__icontains=q)
            | Q(location__icontains=q)
            | Q(user__username__icontains=q)
        )
    offset = max(0, offset)
    limit = max(1, min(limit, 200))
    total = qs.count()
    items = [serialize_workstation(station) for station in qs[offset : offset + limit]]
    return {"items": items, "total": total, "offset": offset, "limit": limit, "has_more": offset + limit < total}


@transaction.atomic
def create_workstation(*, actor: User, payload: dict) -> tuple[WorkstationAccount, str]:
    role = payload.get("assigned_role")
    if role not in HOSPITAL_WORKSTATION_ROLES:
        raise ValidationError({"assigned_role": "Invalid workstation role."})

    username = (payload.get("username") or payload.get("station_code") or "").strip()
    station_name = (payload.get("station_name") or "").strip()
    station_code = (payload.get("station_code") or username).strip()
    if not username or not station_name or not station_code:
        raise ValidationError("username/station_code and station_name are required.")
    if User.objects.filter(username=username).exists():
        raise ValidationError({"username": "Username already exists."})
    if WorkstationAccount.objects.filter(station_name=station_name).exists():
        raise ValidationError({"station_name": "Station name already exists."})
    if WorkstationAccount.objects.filter(station_code=station_code).exists():
        raise ValidationError({"station_code": "Station code already exists."})

    password = payload.get("password") or _temp_password()
    managed_by = actor
    managed_by_id = payload.get("managed_by")
    if managed_by_id and _is_super_admin(actor):
        managed_by = User.objects.filter(id=managed_by_id, account_type=AccountType.PERSONAL).first() or actor

    user = User.objects.create_user(
        username=username,
        password=password,
        role=role,
        account_type=AccountType.WORKSTATION,
        is_staff=True,
    )
    station = user.workstation_profile
    station.station_name = station_name
    station.station_code = station_code
    station.location = payload.get("location", "") or ""
    station.assigned_role = role
    station.is_active = True
    station.managed_by = managed_by
    station.save()

    AuditService.log(
        action="admin_workstation_created",
        entity_type="workstation",
        entity_id=str(station.id),
        performed_by=actor,
        metadata={"station_name": station_name, "assigned_role": role},
    )
    return station, password


@transaction.atomic
def update_workstation(*, actor: User, station: WorkstationAccount, payload: dict) -> WorkstationAccount:
    if "station_name" in payload and payload["station_name"]:
        station.station_name = payload["station_name"].strip()
    if "station_code" in payload and payload["station_code"]:
        station.station_code = payload["station_code"].strip()
    if "location" in payload:
        station.location = payload["location"] or ""
    if "assigned_role" in payload:
        role = payload["assigned_role"]
        if role not in HOSPITAL_WORKSTATION_ROLES:
            raise ValidationError({"assigned_role": "Invalid workstation role."})
        station.assigned_role = role
        station.user.role = role
        station.user.save(update_fields=["role", "updated_at"])
    if "is_active" in payload:
        active = bool(payload["is_active"])
        station.is_active = active
        station.user.is_active = active
        station.user.save(update_fields=["is_active", "updated_at"])
    if "managed_by" in payload and _is_super_admin(actor):
        managed_by_id = payload["managed_by"]
        if managed_by_id:
            station.managed_by = User.objects.filter(id=managed_by_id, account_type=AccountType.PERSONAL).first()
        else:
            station.managed_by = actor
    elif station.managed_by_id is None:
        station.managed_by = actor

    station.save()
    AuditService.log(
        action="admin_workstation_updated",
        entity_type="workstation",
        entity_id=str(station.id),
        performed_by=actor,
        metadata={"fields": sorted(payload.keys())},
    )
    return station


@transaction.atomic
def reset_workstation_password(*, actor: User, station: WorkstationAccount, password: str | None = None) -> str:
    temp = password or _temp_password()
    station.user.set_password(temp)
    station.user.save(update_fields=["password"])
    AuditService.log(
        action="admin_workstation_password_reset",
        entity_type="workstation",
        entity_id=str(station.id),
        performed_by=actor,
        metadata={"username": station.user.username},
    )
    return temp


@transaction.atomic
def delete_workstation(*, actor: User, station: WorkstationAccount, hard: bool = False) -> None:
    station_id = str(station.id)
    station_name = station.station_name
    if hard:
        if not _is_super_admin(actor):
            raise PermissionDenied("Only super admins can hard-delete workstations.")
        user = station.user
        user.delete()
        action = "admin_workstation_deleted"
    else:
        station.is_active = False
        station.user.is_active = False
        station.user.save(update_fields=["is_active", "updated_at"])
        station.save(update_fields=["is_active", "updated_at"])
        action = "admin_workstation_deactivated"
    AuditService.log(
        action=action,
        entity_type="workstation",
        entity_id=station_id,
        performed_by=actor,
        metadata={"station_name": station_name, "hard": hard},
    )
