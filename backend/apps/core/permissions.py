from rest_framework.permissions import BasePermission

from apps.accounts.constants import Role


class HasRole(BasePermission):
    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
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
