import secrets
import string

from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.constants import HOSPITAL_WORKSTATION_ROLES, AccountType, Role
from apps.accounts.models import StudentProfile, User
from apps.audit.services import AuditService


def _temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _is_super_admin(actor: User) -> bool:
    return bool(actor.is_superuser or actor.role == Role.SUPER_ADMIN)


def serialize_user(user: User) -> dict:
    data = {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "phone_number": user.phone_number,
        "role": user.role,
        "account_type": user.account_type,
        "is_active": user.is_active,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "profile": None,
        "workstation": None,
    }
    if hasattr(user, "student_profile"):
        profile = user.student_profile
        data["profile"] = {
            "id": str(profile.id),
            "matric_number": profile.matric_number,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "other_names": profile.other_names,
            "department": profile.department,
            "faculty": profile.faculty,
            "level": profile.level,
            "gender": profile.gender,
            "emergency_contact_name": profile.emergency_contact_name,
            "emergency_contact_phone": profile.emergency_contact_phone,
        }
    if hasattr(user, "workstation_profile"):
        station = user.workstation_profile
        data["workstation"] = {
            "id": str(station.id),
            "station_name": station.station_name,
            "station_code": station.station_code,
            "assigned_role": station.assigned_role,
            "is_active": station.is_active,
        }
    return data


def list_users(
    *,
    role: str = "",
    account_type: str = "",
    is_active: str = "",
    q: str = "",
    offset: int = 0,
    limit: int = 50,
) -> dict:
    qs = User.objects.select_related("student_profile", "workstation_profile").order_by("username")
    if role:
        qs = qs.filter(role=role)
    if account_type:
        qs = qs.filter(account_type=account_type)
    if is_active in ("true", "false"):
        qs = qs.filter(is_active=is_active == "true")
    if q:
        qs = qs.filter(
            Q(username__icontains=q)
            | Q(email__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(student_profile__matric_number__icontains=q)
        )
    offset = max(0, offset)
    limit = max(1, min(limit, 200))
    total = qs.count()
    items = [serialize_user(user) for user in qs[offset : offset + limit]]
    return {"items": items, "total": total, "offset": offset, "limit": limit, "has_more": offset + limit < total}


@transaction.atomic
def create_user(*, actor: User, payload: dict) -> tuple[User, str]:
    account_type = payload.get("account_type")
    role = payload.get("role")
    password = payload.get("password") or _temp_password()

    if account_type == AccountType.STUDENT:
        role = Role.STUDENT
        username = (payload.get("matric_number") or payload.get("username") or "").upper().strip()
        if not username:
            raise ValidationError({"matric_number": "Matric number is required."})
        if User.objects.filter(username=username).exists():
            raise ValidationError({"matric_number": "A user with this matric number already exists."})
        user = User.objects.create_user(
            username=username,
            password=password,
            role=Role.STUDENT,
            account_type=AccountType.STUDENT,
            email=payload.get("email", ""),
            phone_number=payload.get("phone_number", ""),
            first_name=payload.get("first_name", ""),
            last_name=payload.get("last_name", ""),
        )
        StudentProfile.objects.update_or_create(
            user=user,
            defaults={
                "matric_number": username,
                "first_name": payload.get("first_name", "") or user.first_name,
                "last_name": payload.get("last_name", "") or user.last_name,
                "other_names": payload.get("other_names", ""),
                "department": payload.get("department", ""),
                "faculty": payload.get("faculty", ""),
                "level": payload.get("level", ""),
                "gender": payload.get("gender", ""),
                "emergency_contact_name": payload.get("emergency_contact_name", ""),
                "emergency_contact_phone": payload.get("emergency_contact_phone", ""),
            },
        )
    elif account_type == AccountType.PERSONAL:
        if not _is_super_admin(actor):
            raise PermissionDenied("Only super admins can create personal admin users.")
        if role not in (Role.ADMIN, Role.SUPER_ADMIN):
            raise ValidationError({"role": "Personal accounts must be admin or super_admin."})
        username = (payload.get("username") or "").strip()
        if not username:
            raise ValidationError({"username": "Username is required."})
        if User.objects.filter(username=username).exists():
            raise ValidationError({"username": "Username already exists."})
        user = User.objects.create_user(
            username=username,
            password=password,
            role=role,
            account_type=AccountType.PERSONAL,
            email=payload.get("email", ""),
            phone_number=payload.get("phone_number", ""),
            first_name=payload.get("first_name", ""),
            last_name=payload.get("last_name", ""),
            is_staff=True,
            is_superuser=role == Role.SUPER_ADMIN,
        )
    else:
        raise ValidationError({"account_type": "Supported types: student, personal."})

    AuditService.log(
        action="admin_user_created",
        entity_type="user",
        entity_id=str(user.id),
        performed_by=actor,
        metadata={"username": user.username, "role": user.role, "account_type": user.account_type},
    )
    return user, password


@transaction.atomic
def update_user(*, actor: User, user: User, payload: dict) -> User:
    if user.account_type == AccountType.PERSONAL and not _is_super_admin(actor):
        raise PermissionDenied("Only super admins can modify personal admin users.")
    if user.account_type == AccountType.WORKSTATION:
        raise ValidationError("Use the workstations API to manage workstation accounts.")

    if "email" in payload:
        user.email = payload["email"] or ""
    if "phone_number" in payload:
        user.phone_number = payload["phone_number"] or ""
    if "first_name" in payload:
        user.first_name = payload["first_name"] or ""
    if "last_name" in payload:
        user.last_name = payload["last_name"] or ""
    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])

    if user.account_type == AccountType.PERSONAL and "role" in payload:
        new_role = payload["role"]
        if new_role not in (Role.ADMIN, Role.SUPER_ADMIN):
            raise ValidationError({"role": "Invalid personal admin role."})
        if user.id == actor.id and new_role != Role.SUPER_ADMIN and actor.role == Role.SUPER_ADMIN:
            raise ValidationError({"role": "You cannot demote yourself."})
        user.role = new_role
        user.is_superuser = new_role == Role.SUPER_ADMIN

    user.save()

    if user.account_type == AccountType.STUDENT and hasattr(user, "student_profile"):
        profile = user.student_profile
        for field in (
            "first_name",
            "last_name",
            "other_names",
            "department",
            "faculty",
            "level",
            "gender",
            "emergency_contact_name",
            "emergency_contact_phone",
        ):
            if field in payload:
                setattr(profile, field, payload[field] or "")
        if "matric_number" in payload and payload["matric_number"]:
            matric = payload["matric_number"].upper().strip()
            profile.matric_number = matric
            user.username = matric
            user.save(update_fields=["username", "updated_at"])
        profile.save()

    AuditService.log(
        action="admin_user_updated",
        entity_type="user",
        entity_id=str(user.id),
        performed_by=actor,
        metadata={"fields": sorted(payload.keys())},
    )
    return user


@transaction.atomic
def reset_password(*, actor: User, user: User, password: str | None = None) -> str:
    if user.account_type == AccountType.PERSONAL and not _is_super_admin(actor):
        raise PermissionDenied("Only super admins can reset personal admin passwords.")
    if user.role in HOSPITAL_WORKSTATION_ROLES and user.account_type == AccountType.WORKSTATION:
        # allowed for admin
        pass
    temp = password or _temp_password()
    user.set_password(temp)
    user.save(update_fields=["password"])
    AuditService.log(
        action="admin_password_reset",
        entity_type="user",
        entity_id=str(user.id),
        performed_by=actor,
        metadata={"username": user.username},
    )
    return temp


@transaction.atomic
def delete_user(*, actor: User, user: User, hard: bool = False) -> None:
    if not _is_super_admin(actor):
        if hard:
            raise PermissionDenied("Only super admins can hard-delete users.")
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        AuditService.log(
            action="admin_user_deactivated",
            entity_type="user",
            entity_id=str(user.id),
            performed_by=actor,
            metadata={"username": user.username},
        )
        return

    if user.id == actor.id:
        raise ValidationError("You cannot delete yourself.")

    username = user.username
    user_id = str(user.id)
    if hard:
        user.delete()
        action = "admin_user_deleted"
    else:
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        action = "admin_user_deactivated"
    AuditService.log(
        action=action,
        entity_type="user",
        entity_id=user_id,
        performed_by=actor,
        metadata={"username": username, "hard": hard},
    )
