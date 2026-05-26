from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStudent
from apps.notifications.models import Notification
from apps.core.realtime import RealtimeEventService


class NotificationListView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        profile = request.user.student_profile
        notifications = Notification.objects.filter(student=profile).order_by("-created_at")[:100]
        return Response(
            {
                "success": True,
                "data": [
                    {
                        "id": str(n.id),
                        "type": n.notification_type,
                        "title": n.title,
                        "message": n.message,
                        "is_read": n.is_read,
                        "created_at": n.created_at,
                    }
                    for n in notifications
                ],
            }
        )


class MarkNotificationReadView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, notification_id):
        notification = Notification.objects.get(id=notification_id, student=request.user.student_profile)
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        RealtimeEventService.publish_to_user(
            request.user.id,
            "notification.read",
            {"id": str(notification.id), "read_at": notification.read_at.isoformat()},
        )
        return Response({"success": True})
