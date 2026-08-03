from django.urls import path

from apps.chat.views import StudentChatMessagesView

urlpatterns = [
    path("messages/", StudentChatMessagesView.as_view()),
]

