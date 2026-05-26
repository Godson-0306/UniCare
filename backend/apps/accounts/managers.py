from django.contrib.auth.models import BaseUserManager

from apps.accounts.constants import AccountType, Role


class UserManager(BaseUserManager):
    def _create_user(self, username, password, **extra_fields):
        if not username:
            raise ValueError("Username is required")
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(username, password, **extra_fields)

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.SUPER_ADMIN)
        extra_fields.setdefault("account_type", AccountType.PERSONAL)
        return self._create_user(username, password, **extra_fields)

    def create_student(self, matric_number, password=None, **extra_fields):
        extra_fields.setdefault("role", Role.STUDENT)
        extra_fields.setdefault("account_type", AccountType.STUDENT)
        return self._create_user(matric_number.upper(), password, **extra_fields)

    def create_workstation(self, station_username, role, password=None, **extra_fields):
        extra_fields.setdefault("role", role)
        extra_fields.setdefault("account_type", AccountType.WORKSTATION)
        extra_fields.setdefault("is_staff", True)
        return self._create_user(station_username, password, **extra_fields)
