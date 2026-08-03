import pytest

from apps.accounts.constants import AccountType, Role
from apps.accounts.models import User
from apps.chat.models import ChatMessage


@pytest.fixture
def chat_student_user(db):
    user = User.objects.create_user(
        username="CHAT2024999",
        password="student123",
        role=Role.STUDENT,
        account_type=AccountType.STUDENT,
    )
    user.student_profile.first_name = "Chat"
    user.student_profile.last_name = "Student"
    user.student_profile.save()
    return user


@pytest.fixture
def chat_other_student_user(db):
    user = User.objects.create_user(
        username="CHAT2024888",
        password="student123",
        role=Role.STUDENT,
        account_type=AccountType.STUDENT,
    )
    user.student_profile.first_name = "Other"
    user.student_profile.last_name = "Student"
    user.student_profile.save()
    return user


@pytest.fixture
def chat_receptionist_user(db):
    user = User.objects.create_user(
        username="chat_reception_test",
        password="workstation123",
        role=Role.RECEPTIONIST,
        account_type=AccountType.WORKSTATION,
        is_staff=True,
    )
    user.workstation_profile.station_name = "Chat Reception Test"
    user.workstation_profile.station_code = "chat_reception_test"
    user.workstation_profile.assigned_role = Role.RECEPTIONIST
    user.workstation_profile.save()
    return user


@pytest.fixture
def chat_pharmacist_user(db):
    user = User.objects.create_user(
        username="chat_pharmacy_test",
        password="workstation123",
        role=Role.PHARMACIST,
        account_type=AccountType.WORKSTATION,
        is_staff=True,
    )
    user.workstation_profile.station_name = "Chat Pharmacy Test"
    user.workstation_profile.station_code = "chat_pharmacy_test"
    user.workstation_profile.assigned_role = Role.PHARMACIST
    user.workstation_profile.save()
    return user


@pytest.mark.django_db
def test_student_chat_only_returns_own_messages(api_client, chat_student_user, chat_other_student_user):
    ChatMessage.objects.create(
        student=chat_student_user.student_profile,
        sender=chat_student_user,
        content="I need help with an appointment.",
    )
    ChatMessage.objects.create(
        student=chat_other_student_user.student_profile,
        sender=chat_other_student_user,
        content="Private message from another student.",
    )

    api_client.force_authenticate(user=chat_student_user)
    response = api_client.get("/api/v1/student/chat/messages/")

    assert response.status_code == 200
    assert response.data["success"] is True
    contents = [message["content"] for message in response.data["data"]]
    assert "I need help with an appointment." in contents
    assert "Private message from another student." not in contents


@pytest.mark.django_db
def test_student_can_send_chat_message(api_client, chat_student_user):
    api_client.force_authenticate(user=chat_student_user)
    response = api_client.post(
        "/api/v1/student/chat/messages/",
        {"content": "Can reception confirm my visit time?"},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["success"] is True
    message = ChatMessage.objects.get(id=response.data["data"]["id"])
    assert message.student == chat_student_user.student_profile
    assert message.sender == chat_student_user
    assert message.content == "Can reception confirm my visit time?"


@pytest.mark.django_db
def test_reception_can_list_threads_and_reply(hospital_api_client, chat_student_user, chat_receptionist_user):
    ChatMessage.objects.create(
        student=chat_student_user.student_profile,
        sender=chat_student_user,
        content="Hello reception.",
    )

    client = hospital_api_client(chat_receptionist_user)
    threads_response = client.get("/api/v1/reception/chat/threads/")

    assert threads_response.status_code == 200
    assert threads_response.data["success"] is True
    assert threads_response.data["data"][0]["student"]["id"] == str(chat_student_user.student_profile.id)
    assert threads_response.data["data"][0]["unread_count"] == 1

    reply_response = client.post(
        f"/api/v1/reception/chat/threads/{chat_student_user.student_profile.id}/reply/",
        {"content": "Your visit is confirmed."},
        format="json",
    )

    assert reply_response.status_code == 201
    message = ChatMessage.objects.get(id=reply_response.data["data"]["id"])
    assert message.student == chat_student_user.student_profile
    assert message.sender == chat_receptionist_user
    assert message.recipient == chat_student_user


@pytest.mark.django_db
def test_non_reception_staff_cannot_access_reception_chat(hospital_api_client, chat_pharmacist_user):
    client = hospital_api_client(chat_pharmacist_user)

    response = client.get("/api/v1/reception/chat/threads/")

    assert response.status_code == 403
    assert response.data["success"] is False


@pytest.mark.django_db
def test_reception_can_mark_patient_messages_read(hospital_api_client, chat_student_user, chat_receptionist_user):
    message = ChatMessage.objects.create(
        student=chat_student_user.student_profile,
        sender=chat_student_user,
        content="Please call me back.",
    )

    client = hospital_api_client(chat_receptionist_user)
    response = client.post(f"/api/v1/reception/chat/threads/{chat_student_user.student_profile.id}/read/")

    assert response.status_code == 200
    assert response.data["data"]["updated"] == 1
    message.refresh_from_db()
    assert message.is_read is True


@pytest.mark.django_db
def test_chat_message_publishes_realtime_events(api_client, chat_student_user, monkeypatch):
    published = []

    def fake_publish_to_user(user_id, event, payload):
        published.append(("user", user_id, event, payload["content"]))

    def fake_publish_to_role(role, event, payload):
        published.append(("role", role, event, payload["content"]))

    monkeypatch.setattr("apps.chat.services.RealtimeEventService.publish_to_user", fake_publish_to_user)
    monkeypatch.setattr("apps.chat.services.RealtimeEventService.publish_to_role", fake_publish_to_role)

    api_client.force_authenticate(user=chat_student_user)
    response = api_client.post(
        "/api/v1/student/chat/messages/",
        {"content": "Realtime please."},
        format="json",
    )

    assert response.status_code == 201
    assert ("user", chat_student_user.id, "chat.message_created", "Realtime please.") in published
    assert ("role", Role.RECEPTIONIST, "chat.message_created", "Realtime please.") in published
    assert ("role", Role.ADMIN, "chat.message_created", "Realtime please.") in published
    assert ("role", Role.SUPER_ADMIN, "chat.message_created", "Realtime please.") in published
