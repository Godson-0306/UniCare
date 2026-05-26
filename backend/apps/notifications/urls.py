from django.urls import path

from apps.notifications.views import MarkNotificationReadView, NotificationListView

urlpatterns = [
    path("", NotificationListView.as_view()),
    path("<uuid:notification_id>/read/", MarkNotificationReadView.as_view()),
]
