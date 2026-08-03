from django.db.models import Count, F, Max, Q

from apps.accounts.constants import Role
from apps.accounts.models import StudentProfile
from apps.chat.models import ChatMessage
from apps.chat.serializers import ChatMessageSerializer
from apps.core.realtime import RealtimeEventService


RECEPTION_CHAT_ROLES = (Role.RECEPTIONIST, Role.ADMIN, Role.SUPER_ADMIN)


class ChatService:
    @staticmethod
    def list_student_messages(student: StudentProfile, *, limit: int = 100):
        messages = (
            ChatMessage.objects.filter(student=student)
            .select_related("sender", "sender__student_profile", "sender__workstation_profile", "student")
            .order_by("-created_at")[:limit]
        )
        return list(reversed(list(messages)))

    @staticmethod
    def list_reception_threads():
        students = (
            StudentProfile.objects.filter(chat_messages__isnull=False)
            .annotate(
                last_message_at=Max("chat_messages__created_at"),
                unread_count=Count(
                    "chat_messages",
                    filter=Q(chat_messages__sender=F("user"), chat_messages__is_read=False),
                ),
            )
            .order_by("-last_message_at")
            .distinct()
        )
        threads = []
        for student in students:
            latest_message = (
                ChatMessage.objects.filter(student=student)
                .select_related("sender", "sender__student_profile", "sender__workstation_profile", "student")
                .order_by("-created_at")
                .first()
            )
            threads.append(
                {
                    "student": {
                        "id": str(student.id),
                        "full_name": student.full_name,
                        "matric_number": student.matric_number,
                        "department": student.department,
                        "faculty": student.faculty,
                        "level": student.level,
                    },
                    "latest_message": ChatMessageSerializer(latest_message).data if latest_message else None,
                    "unread_count": student.unread_count,
                    "last_message_at": student.last_message_at,
                }
            )
        return threads

    @classmethod
    def create_student_message(cls, *, student: StudentProfile, sender, content: str) -> ChatMessage:
        message = ChatMessage.objects.create(student=student, sender=sender, content=content)
        cls.publish_message_created(message)
        return message

    @classmethod
    def create_reception_reply(cls, *, student: StudentProfile, sender, content: str) -> ChatMessage:
        message = ChatMessage.objects.create(
            student=student,
            sender=sender,
            recipient=student.user,
            content=content,
        )
        cls.publish_message_created(message)
        return message

    @staticmethod
    def mark_student_messages_read(*, student: StudentProfile) -> int:
        return ChatMessage.objects.filter(student=student, sender=student.user, is_read=False).update(is_read=True)

    @staticmethod
    def publish_message_created(message: ChatMessage) -> None:
        payload = ChatMessageSerializer(message).data
        RealtimeEventService.publish_to_user(message.student.user_id, "chat.message_created", payload)
        for role in RECEPTION_CHAT_ROLES:
            RealtimeEventService.publish_to_role(role, "chat.message_created", payload)
