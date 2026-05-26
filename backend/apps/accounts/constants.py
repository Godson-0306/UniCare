from django.db import models


class Role(models.TextChoices):
    STUDENT = "student", "Student"
    RECEPTIONIST = "receptionist", "Receptionist"
    NURSE = "nurse", "Nurse"
    DOCTOR = "doctor", "Doctor"
    PHARMACIST = "pharmacist", "Pharmacist"
    LAB_TECHNICIAN = "lab_technician", "Lab Technician"
    DUTY_OFFICER = "duty_officer", "Duty Officer"
    ADMIN = "admin", "Admin"
    SUPER_ADMIN = "super_admin", "Super Admin"


class AccountType(models.TextChoices):
    STUDENT = "student", "Student"
    WORKSTATION = "workstation", "Workstation"
    PERSONAL = "personal", "Personal Admin"


HOSPITAL_WORKSTATION_ROLES = {
    Role.RECEPTIONIST,
    Role.NURSE,
    Role.DOCTOR,
    Role.PHARMACIST,
    Role.LAB_TECHNICIAN,
    Role.DUTY_OFFICER,
}

PERSONAL_ADMIN_ROLES = {Role.ADMIN, Role.SUPER_ADMIN}
