import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.constants import AccountType, Role
from apps.accounts.models import StudentProfile, User


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(api_client):
    user = User.objects.create_user(
        username="student",
        password="password",
        role=Role.STUDENT,
        account_type=AccountType.STUDENT,
    )
    refresh = RefreshToken.for_user(user)
    api_client.force_authenticate(user=user)

    response = api_client.post("/api/v1/auth/logout/", {"refresh": str(refresh)}, format="json")

    assert response.status_code == 200
    assert response.data["success"] is True


@pytest.mark.django_db
def test_logout_requires_refresh_token(api_client):
    user = User.objects.create_user(
        username="student",
        password="password",
        role=Role.STUDENT,
        account_type=AccountType.STUDENT,
    )
    api_client.force_authenticate(user=user)

    response = api_client.post("/api/v1/auth/logout/", {}, format="json")

    assert response.status_code == 400
    assert response.data["success"] is False


@pytest.mark.django_db
def test_student_login_returns_profile(api_client):
    user = User.objects.create_user(
        username="U2024555",
        password="student123",
        role=Role.STUDENT,
        account_type=AccountType.STUDENT,
    )
    StudentProfile.objects.update_or_create(
        user=user,
        defaults={
            "matric_number": "U2024555",
            "first_name": "Realtime",
            "last_name": "Student",
        },
    )

    response = api_client.post(
        "/api/v1/auth/login/",
        {"identifier": "U2024555", "password": "student123"},
        format="json",
        HTTP_HOST="localhost",
    )

    assert response.status_code == 200
    assert response.data["success"] is True
    assert response.data["data"]["profile"]["matric_number"] == "U2024555"
