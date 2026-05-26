from django.contrib.auth.password_validation import validate_password
from django.db import transaction

from apps.accounts.constants import AccountType, Role
from apps.accounts.models import StudentProfile, User
from apps.audit.services import AuditService


class StudentOnboardingService:
    @classmethod
    @transaction.atomic
    def register_student(
        cls,
        *,
        matric_number: str,
        password: str,
        first_name: str,
        last_name: str,
        other_names: str = "",
        faculty: str = "",
        department: str = "",
        level: str = "",
        date_of_birth=None,
        gender: str = "",
        phone_number: str = "",
        email: str = "",
        emergency_contact_name: str = "",
        emergency_contact_phone: str = "",
        medical_notes: str = "",
    ) -> StudentProfile:
        matric = matric_number.strip().upper()
        validate_password(password)

        user = User.objects.create_user(
            username=matric,
            password=password,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            email=email.strip(),
            phone_number=phone_number.strip(),
            role=Role.STUDENT,
            account_type=AccountType.STUDENT,
        )
        profile = StudentProfile.objects.create(
            user=user,
            matric_number=matric,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            other_names=other_names.strip(),
            faculty=faculty.strip(),
            department=department.strip(),
            level=level.strip(),
            date_of_birth=date_of_birth,
            gender=gender.strip(),
            emergency_contact_name=emergency_contact_name.strip(),
            emergency_contact_phone=emergency_contact_phone.strip(),
            medical_notes=medical_notes.strip(),
        )
        AuditService.log(
            action="student_registered",
            entity_type="student_profile",
            entity_id=str(profile.id),
            performed_by=user,
            metadata={"matric_number": profile.matric_number},
        )
        return profile
