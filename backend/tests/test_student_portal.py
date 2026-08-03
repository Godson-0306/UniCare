import pytest

from apps.clinical.models import Prescription
from apps.visits.models import Visit
from apps.visits.services.visit_service import VisitService


@pytest.mark.django_db
def test_student_prescriptions_only_return_own_records(api_client, student_user, other_student_user, receptionist_user):
    VisitService.create_visit(
        student=student_user.student_profile,
        chief_complaint="Cough",
        reception_notes="",
        performed_by=receptionist_user,
        enqueue_initial=False,
    )
    own_visit = Visit.objects.get(student=student_user.student_profile)
    Prescription.objects.create(
        visit=own_visit,
        prescription_number="RX-TEST-001",
        performed_by=receptionist_user,
    )

    other_visit = VisitService.create_visit(
        student=other_student_user.student_profile,
        chief_complaint="Allergy",
        reception_notes="",
        performed_by=receptionist_user,
        enqueue_initial=False,
    )
    Prescription.objects.create(
        visit=other_visit,
        prescription_number="RX-TEST-002",
        performed_by=receptionist_user,
    )

    api_client.force_authenticate(user=student_user)
    response = api_client.get("/api/v1/student/prescriptions/")

    assert response.status_code == 200
    assert response.data["success"] is True
    numbers = [item["prescription_number"] for item in response.data["data"]]
    assert "RX-TEST-001" in numbers
    assert "RX-TEST-002" not in numbers


@pytest.mark.django_db
def test_student_notifications_mark_read_returns_404_for_other_notification(api_client, student_user, other_student_user):
    from apps.notifications.models import Notification

    foreign_notification = Notification.objects.create(
        student=other_student_user.student_profile,
        notification_type="general",
        title="Other student alert",
        message="Private update",
    )

    api_client.force_authenticate(user=student_user)
    response = api_client.post(f"/api/v1/notifications/{foreign_notification.id}/read/")

    assert response.status_code == 404
    assert response.data["success"] is False
