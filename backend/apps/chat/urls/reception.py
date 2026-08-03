from django.urls import path

from apps.chat.views import (
    ReceptionChatMarkReadView,
    ReceptionChatReplyView,
    ReceptionChatThreadListView,
    ReceptionChatThreadMessagesView,
)

urlpatterns = [
    path("threads/", ReceptionChatThreadListView.as_view()),
    path("threads/<uuid:student_id>/messages/", ReceptionChatThreadMessagesView.as_view()),
    path("threads/<uuid:student_id>/reply/", ReceptionChatReplyView.as_view()),
    path("threads/<uuid:student_id>/read/", ReceptionChatMarkReadView.as_view()),
]

