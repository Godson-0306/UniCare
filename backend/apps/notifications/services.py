from apps.core.realtime import RealtimeEventService
from apps.notifications.models import Notification


class NotificationService:
    @classmethod
    def create_notification(
        cls,
        *,
        student,
        notification_type: str,
        title: str,
        message: str,
        metadata: dict | None = None,
    ) -> Notification:
        notification = Notification.objects.create(
            student=student,
            notification_type=notification_type,
            title=title,
            message=message,
            metadata=metadata or {},
        )
        RealtimeEventService.publish_to_user(
            student.user_id,
            "notification.created",
            {
                "id": str(notification.id),
                "type": notification.notification_type,
                "title": notification.title,
                "message": notification.message,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
                "metadata": notification.metadata,
            },
        )
        return notification
