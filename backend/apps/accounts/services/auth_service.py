from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.constants import AccountType, Role
from apps.accounts.models import User, WorkstationAccount
from apps.audit.services import AuditService


class AuthenticationError(Exception):
    pass


class AuthService:
    @staticmethod
    def authenticate_login(identifier: str, password: str) -> dict:
        """Single entry-point: resolves student, workstation, or admin from credentials."""
        raw = identifier.strip()
        if not raw or not password:
            raise AuthenticationError("User ID and password are required.")

        user = None
        for username in _username_candidates(raw):
            user = authenticate(username=username, password=password)
            if user:
                break

        if not user:
            raise AuthenticationError("Invalid user ID or password.")
        if not user.is_active:
            raise AuthenticationError("Account is inactive.")

        if user.account_type == AccountType.STUDENT:
            tokens = AuthService._issue_tokens(user)
            AuditService.log(
                action="student_login",
                entity_type="user",
                entity_id=str(user.id),
                performed_by=user,
                metadata={"matric_number": user.username},
            )
            return {"user": user, "tokens": tokens}

        if user.account_type == AccountType.WORKSTATION:
            try:
                workstation = user.workstation_profile
            except WorkstationAccount.DoesNotExist:
                raise AuthenticationError("Workstation profile not found.") from None
            if not workstation.is_active:
                raise AuthenticationError("Workstation is disabled.")
            if user.role != workstation.assigned_role:
                raise AuthenticationError("Role mismatch for workstation account.")
            workstation.last_login_at = timezone.now()
            workstation.save(update_fields=["last_login_at", "updated_at"])
            tokens = AuthService._issue_tokens(user)
            AuditService.log(
                action="workstation_login",
                entity_type="workstation",
                entity_id=str(workstation.id),
                performed_by=user,
                metadata={"station": workstation.station_name, "role": user.role},
            )
            return {"user": user, "workstation": workstation, "tokens": tokens}

        if user.account_type == AccountType.PERSONAL:
            if user.role not in {Role.ADMIN, Role.SUPER_ADMIN}:
                raise AuthenticationError("Insufficient privileges.")
            tokens = AuthService._issue_tokens(user)
            AuditService.log(
                action="admin_login",
                entity_type="user",
                entity_id=str(user.id),
                performed_by=user,
            )
            return {"user": user, "tokens": tokens}

        raise AuthenticationError("Unsupported account type.")

    @staticmethod
    def authenticate_student(matric_number: str, password: str) -> dict:
        username = matric_number.strip().upper()
        user = authenticate(username=username, password=password)
        if not user or user.account_type != AccountType.STUDENT:
            raise AuthenticationError("Invalid matric number or password.")
        if not user.is_active:
            raise AuthenticationError("Account is inactive.")
        tokens = AuthService._issue_tokens(user)
        AuditService.log(
            action="student_login",
            entity_type="user",
            entity_id=str(user.id),
            performed_by=user,
            metadata={"matric_number": username},
        )
        return {"user": user, "tokens": tokens}

    @staticmethod
    def authenticate_workstation(station_username: str, password: str) -> dict:
        user = authenticate(username=station_username.strip().lower(), password=password)
        if not user or user.account_type != AccountType.WORKSTATION:
            raise AuthenticationError("Invalid workstation credentials.")
        if not user.is_active:
            raise AuthenticationError("Workstation account is inactive.")
        try:
            workstation = user.workstation_profile
        except WorkstationAccount.DoesNotExist:
            raise AuthenticationError("Workstation profile not found.") from None
        if not workstation.is_active:
            raise AuthenticationError("Workstation is disabled.")
        if user.role != workstation.assigned_role:
            raise AuthenticationError("Role mismatch for workstation account.")

        workstation.last_login_at = timezone.now()
        workstation.save(update_fields=["last_login_at", "updated_at"])

        tokens = AuthService._issue_tokens(user)
        AuditService.log(
            action="workstation_login",
            entity_type="workstation",
            entity_id=str(workstation.id),
            performed_by=user,
            metadata={"station": workstation.station_name, "role": user.role},
        )
        return {"user": user, "workstation": workstation, "tokens": tokens}

    @staticmethod
    def authenticate_admin(username: str, password: str) -> dict:
        user = authenticate(username=username, password=password)
        if not user or user.account_type != AccountType.PERSONAL:
            raise AuthenticationError("Invalid admin credentials.")
        if user.role not in {Role.ADMIN, Role.SUPER_ADMIN}:
            raise AuthenticationError("Insufficient privileges.")
        if not user.is_active:
            raise AuthenticationError("Account is inactive.")
        tokens = AuthService._issue_tokens(user)
        AuditService.log(
            action="admin_login",
            entity_type="user",
            entity_id=str(user.id),
            performed_by=user,
        )
        return {"user": user, "tokens": tokens}

    @staticmethod
    def _issue_tokens(user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["account_type"] = user.account_type
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


def _username_candidates(identifier: str) -> list[str]:
    raw = identifier.strip()
    candidates = [raw, raw.lower(), raw.upper()]
    seen: set[str] = set()
    ordered: list[str] = []
    for name in candidates:
        if name and name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered
