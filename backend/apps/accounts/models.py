from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.accounts.constants import AccountType, Role
from apps.accounts.managers import UserManager
from apps.core.models import TimeStampedModel, UUIDPrimaryKeyModel


class User(AbstractUser, UUIDPrimaryKeyModel, TimeStampedModel):
    email = models.EmailField(blank=True)
    role = models.CharField(max_length=32, choices=Role.choices, db_index=True)
    account_type = models.CharField(max_length=16, choices=AccountType.choices, db_index=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        db_table = "accounts_user"
        indexes = [
            models.Index(fields=["role", "account_type"]),
            models.Index(fields=["username"]),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_student(self):
        return self.account_type == AccountType.STUDENT

    @property
    def is_workstation(self):
        return self.account_type == AccountType.WORKSTATION

    @property
    def is_personal_admin(self):
        return self.account_type == AccountType.PERSONAL


class StudentProfile(UUIDPrimaryKeyModel, TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    matric_number = models.CharField(max_length=32, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    other_names = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=120, blank=True)
    faculty = models.CharField(max_length=120, blank=True)
    level = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=16, blank=True)
    blood_group = models.CharField(max_length=8, blank=True)
    emergency_contact_name = models.CharField(max_length=120, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    medical_notes = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)

    class Meta:
        db_table = "accounts_student_profile"
        indexes = [
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["matric_number"]),
        ]

    def __str__(self):
        return f"{self.matric_number} - {self.full_name}"

    @property
    def full_name(self):
        parts = [self.first_name, self.other_names, self.last_name]
        return " ".join(p for p in parts if p).strip()


class WorkstationAccount(UUIDPrimaryKeyModel, TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="workstation_profile")
    station_name = models.CharField(max_length=64, unique=True, db_index=True)
    station_code = models.CharField(max_length=32, unique=True)
    location = models.CharField(max_length=120, blank=True)
    assigned_role = models.CharField(max_length=32, choices=Role.choices, db_index=True)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    managed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_workstations",
    )

    class Meta:
        db_table = "accounts_workstation"
        indexes = [
            models.Index(fields=["assigned_role", "is_active"]),
        ]

    def __str__(self):
        return self.station_name
