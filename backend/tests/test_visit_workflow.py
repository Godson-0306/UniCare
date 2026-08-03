import pytest

from apps.accounts.models import StudentProfile
from apps.visits.constants import QueueStage, QueueStatus
from apps.visits.models import QueueEntry
from apps.visits.services.visit_service import VisitService


@pytest.mark.django_db
def test_create_visit_enqueues_nurse_queue(student_user, receptionist_user):
    profile = student_user.student_profile

    visit = VisitService.create_visit(
        student=profile,
        chief_complaint="Headache",
        reception_notes="Walk-in patient",
        performed_by=receptionist_user,
    )

    assert visit.visit_number.startswith("V-")
    queue_entry = QueueEntry.objects.get(visit=visit, stage=QueueStage.NURSE)
    assert queue_entry.status == QueueStatus.WAITING


@pytest.mark.django_db
def test_nurse_queue_lists_created_visit(hospital_api_client, student_user, receptionist_user, nurse_user):
    VisitService.create_visit(
        student=student_user.student_profile,
        chief_complaint="Fever",
        reception_notes="Needs vitals",
        performed_by=receptionist_user,
    )

    client = hospital_api_client(nurse_user)
    response = client.get("/api/v1/nurse/queue/")

    assert response.status_code == 200
    assert response.data["success"] is True
    assert len(response.data["data"]) >= 1


@pytest.mark.django_db
def test_visit_detail_returns_404_for_missing_visit(hospital_api_client, nurse_user):
    client = hospital_api_client(nurse_user)
    response = client.post(
        "/api/v1/nurse/visits/00000000-0000-0000-0000-000000000099/forward-doctor/",
        format="json",
    )

    assert response.status_code == 404
    assert response.data["success"] is False
