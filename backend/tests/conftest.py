import pytest
from rest_framework.test import APIClient

from apps.accounts.constants import AccountType, Role
from apps.accounts.models import User
from apps.clinical.models import Prescription
from apps.visits.constants import QueueStage
from apps.visits.models import QueueEntry, Visit
from apps.visits.services.visit_service import VisitService


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def student_user(db):
    user = User.objects.create_user(
        username="U2024999",
        password="student123",
        role=Role.STUDENT,
        account_type=AccountType.STUDENT,
    )
    user.student_profile.matric_number = "U2024999"
    user.student_profile.first_name = "Test"
    user.student_profile.last_name = "Student"
    user.student_profile.save()
    return user


@pytest.fixture
def other_student_user(db):
    user = User.objects.create_user(
        username="U2024888",
        password="student123",
        role=Role.STUDENT,
        account_type=AccountType.STUDENT,
    )
    user.student_profile.matric_number = "U2024888"
    user.student_profile.first_name = "Other"
    user.student_profile.last_name = "Student"
    user.student_profile.save()
    return user


@pytest.fixture
def receptionist_user(db):
    user = User.objects.create_user(
        username="reception_test",
        password="workstation123",
        role=Role.RECEPTIONIST,
        account_type=AccountType.WORKSTATION,
        is_staff=True,
    )
    user.workstation_profile.station_name = "Reception Test"
    user.workstation_profile.station_code = "reception_test"
    user.workstation_profile.assigned_role = Role.RECEPTIONIST
    user.workstation_profile.save()
    return user


@pytest.fixture
def nurse_user(db):
    user = User.objects.create_user(
        username="nurse_test",
        password="workstation123",
        role=Role.NURSE,
        account_type=AccountType.WORKSTATION,
        is_staff=True,
    )
    user.workstation_profile.station_name = "Nurse Test"
    user.workstation_profile.station_code = "nurse_test"
    user.workstation_profile.assigned_role = Role.NURSE
    user.workstation_profile.save()
    return user


@pytest.fixture
def hospital_api_client(api_client, settings):
    settings.HOSPITAL_ACCESS_SECRET = "test-hospital-secret"

    def _authenticate(user):
        api_client.force_authenticate(user=user)
        api_client.credentials(HTTP_X_HOSPITAL_ACCESS_TOKEN="test-hospital-secret")
        return api_client

    return _authenticate
