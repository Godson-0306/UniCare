import pytest

from apps.accounts.constants import AccountType, Role
from apps.accounts.models import User, WorkstationAccount
from apps.audit.models import AuditLog
from apps.emergency.models import EmergencyEvent
from apps.visits.constants import QueueStage, QueueStatus
from apps.visits.models import QueueEntry


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin_plain",
        password="admin123",
        role=Role.ADMIN,
        account_type=AccountType.PERSONAL,
        is_staff=True,
        is_superuser=False,
    )


@pytest.fixture
def super_admin_user(db):
    return User.objects.create_user(
        username="super_plain",
        password="superadmin123",
        role=Role.SUPER_ADMIN,
        account_type=AccountType.PERSONAL,
        is_staff=True,
        is_superuser=False,
    )


@pytest.mark.django_db
def test_admin_overview_requires_admin(hospital_api_client, student_user, admin_user):
    client = hospital_api_client(student_user)
    denied = client.get("/api/v1/admin/overview/")
    assert denied.status_code == 403

    client = hospital_api_client(admin_user)
    ok = client.get("/api/v1/admin/overview/")
    assert ok.status_code == 200
    assert ok.data["success"] is True
    assert "active_visits" in ok.data["data"]
    assert "recent_audit" in ok.data["data"]


@pytest.mark.django_db
def test_analytics_stable_keys(hospital_api_client, admin_user):
    client = hospital_api_client(admin_user)
    response = client.get("/api/v1/admin/analytics/?days=7")
    assert response.status_code == 200
    data = response.data["data"]
    assert set(data["totals"]) >= {"patient_visits", "appointments", "prescriptions", "lab_requests", "emergency_cases"}
    assert data["window_days"] == 7
    assert isinstance(data["most_common_diagnoses"], list)
    assert isinstance(data["doctor_workload_distribution"], list)


@pytest.mark.django_db
def test_audit_logs_filter_and_pagination(hospital_api_client, admin_user):
    AuditLog.objects.create(action="visit_created", entity_type="visit", entity_id="1", role="receptionist")
    AuditLog.objects.create(action="admin_login", entity_type="user", entity_id="2", role="admin")
    client = hospital_api_client(admin_user)

    response = client.get("/api/v1/admin/audit-logs/?action=admin&limit=10")
    assert response.status_code == 200
    body = response.data["data"]
    assert body["total"] >= 1
    assert all("admin" in item["action"] for item in body["items"])

    export = client.get("/api/v1/admin/audit-logs/export/?action=admin")
    assert export.status_code == 200
    assert "text/csv" in export["Content-Type"]
    assert b"admin_login" in export.content


@pytest.mark.django_db
def test_create_student_user(hospital_api_client, admin_user):
    client = hospital_api_client(admin_user)
    response = client.post(
        "/api/v1/admin/users/",
        {
            "account_type": "student",
            "matric_number": "U2099001",
            "first_name": "Ngozi",
            "last_name": "Ade",
            "department": "Medicine",
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.data["data"]["username"] == "U2099001"
    assert response.data["data"]["profile"]["matric_number"] == "U2099001"
    assert response.data["data"]["temporary_password"]


@pytest.mark.django_db
def test_admin_cannot_create_personal_admin(hospital_api_client, admin_user):
    client = hospital_api_client(admin_user)
    response = client.post(
        "/api/v1/admin/users/",
        {"account_type": "personal", "username": "newadmin", "role": "admin"},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_super_admin_can_create_personal_admin(hospital_api_client, super_admin_user):
    client = hospital_api_client(super_admin_user)
    response = client.post(
        "/api/v1/admin/users/",
        {"account_type": "personal", "username": "newadmin", "role": "admin", "email": "a@example.com"},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["data"]["role"] == "admin"
    assert response.data["data"]["account_type"] == "personal"


@pytest.mark.django_db
def test_workstation_provision_and_managed_by(hospital_api_client, admin_user):
    client = hospital_api_client(admin_user)
    response = client.post(
        "/api/v1/admin/workstations/",
        {
            "username": "triage_station",
            "station_name": "Triage Desk",
            "station_code": "triage_station",
            "assigned_role": "nurse",
            "location": "Block A",
        },
        format="json",
    )
    assert response.status_code == 201
    data = response.data["data"]
    assert data["station_name"] == "Triage Desk"
    assert data["assigned_role"] == "nurse"
    assert data["managed_by_username"] == admin_user.username
    assert data["temporary_password"]

    station = WorkstationAccount.objects.get(station_code="triage_station")
    reset = client.post(f"/api/v1/admin/workstations/{station.id}/reset-password/", {}, format="json")
    assert reset.status_code == 200
    assert reset.data["data"]["temporary_password"]


@pytest.mark.django_db
def test_ops_queues_and_lists(hospital_api_client, admin_user, student_user, receptionist_user):
    from apps.visits.services.visit_service import VisitService

    visit = VisitService.create_visit(
        student=student_user.student_profile,
        chief_complaint="Fever",
        reception_notes="Walk-in",
        performed_by=receptionist_user,
    )
    assert QueueEntry.objects.filter(visit=visit, stage=QueueStage.NURSE, status=QueueStatus.WAITING).exists()

    EmergencyEvent.objects.create(
        student=student_user.student_profile,
        description="Collapsed",
        status="triggered",
        performed_by=receptionist_user,
    )

    client = hospital_api_client(admin_user)
    ops = client.get("/api/v1/admin/ops/queues/")
    assert ops.status_code == 200
    stages = {row["stage"]: row for row in ops.data["data"]["stages"]}
    assert stages["nurse"]["waiting"] >= 1

    emergencies = client.get("/api/v1/admin/emergencies/?status=triggered")
    assert emergencies.status_code == 200
    assert emergencies.data["data"]["total"] >= 1

    appointments = client.get("/api/v1/admin/appointments/")
    assert appointments.status_code == 200
    assert "items" in appointments.data["data"]


@pytest.mark.django_db
def test_legacy_audit_endpoints_still_work(hospital_api_client, admin_user):
    client = hospital_api_client(admin_user)
    logs = client.get("/api/v1/audit/logs/")
    analytics = client.get("/api/v1/audit/analytics/")
    assert logs.status_code == 200
    assert isinstance(logs.data["data"], list)
    assert analytics.status_code == 200
    assert "totals" in analytics.data["data"]
