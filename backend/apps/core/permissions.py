from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied

from apps.accounts.constants import HOSPITAL_WORKSTATION_ROLES, Role
from apps.visits.constants import QueueStage, QueueStatus


class HasRole(BasePermission):
    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if user.role in HOSPITAL_WORKSTATION_ROLES:
            if not hasattr(user, "workstation_profile") or not user.workstation_profile.is_active:
                return False
        return user.role in self.allowed_roles


class IsStudent(HasRole):
    allowed_roles = (Role.STUDENT,)


class IsReceptionist(HasRole):
    allowed_roles = (Role.RECEPTIONIST, Role.ADMIN, Role.SUPER_ADMIN)


class IsNurse(HasRole):
    allowed_roles = (Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN)


class IsDoctor(HasRole):
    allowed_roles = (Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN)


class IsPharmacist(HasRole):
    allowed_roles = (Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN)


class IsLabTechnician(HasRole):
    allowed_roles = (Role.LAB_TECHNICIAN, Role.ADMIN, Role.SUPER_ADMIN)


class IsDutyOfficer(HasRole):
    allowed_roles = (Role.DUTY_OFFICER, Role.ADMIN, Role.SUPER_ADMIN)


class IsAdminUser(HasRole):
    allowed_roles = (Role.ADMIN, Role.SUPER_ADMIN)


class IsSuperAdmin(HasRole):
    allowed_roles = (Role.SUPER_ADMIN,)


class IsHospitalStaff(HasRole):
    allowed_roles = (
        Role.RECEPTIONIST,
        Role.NURSE,
        Role.DOCTOR,
        Role.PHARMACIST,
        Role.LAB_TECHNICIAN,
        Role.DUTY_OFFICER,
        Role.ADMIN,
        Role.SUPER_ADMIN,
    )


class IsWorkstationAccount(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and hasattr(user, "workstation_profile")
            and user.workstation_profile.is_active
        )


ROLE_QUEUE_STAGE = {
    Role.NURSE: QueueStage.NURSE,
    Role.DOCTOR: QueueStage.DOCTOR,
    Role.PHARMACIST: QueueStage.PHARMACY,
    Role.LAB_TECHNICIAN: QueueStage.LAB,
}


def assert_staff_can_access_visit(user, visit):
    if user.is_superuser or user.role in (Role.ADMIN, Role.SUPER_ADMIN, Role.RECEPTIONIST, Role.DUTY_OFFICER):
        return

    stage = ROLE_QUEUE_STAGE.get(user.role)
    if not stage:
        raise PermissionDenied("You do not have access to this visit.")

    is_in_queue = visit.queue_entries.filter(
        stage=stage,
        status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
    ).filter(assigned_to__in=[None, user]).exists()
    if not is_in_queue:
        raise PermissionDenied("You do not have access to this visit.")


def assert_staff_can_access_student(user, student):
    if user.is_superuser or user.role in (Role.ADMIN, Role.SUPER_ADMIN, Role.RECEPTIONIST, Role.DUTY_OFFICER):
        return

    stage = ROLE_QUEUE_STAGE.get(user.role)
    if not stage:
        raise PermissionDenied("You do not have access to this student.")

    has_active_queue = student.visits.filter(
        queue_entries__stage=stage,
        queue_entries__status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
    ).filter(queue_entries__assigned_to__in=[None, user]).exists()
    if not has_active_queue:
        raise PermissionDenied("You do not have access to this student.")
