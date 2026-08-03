from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StudentProfile
from apps.chat.serializers import ChatMessageCreateSerializer, ChatMessageSerializer
from apps.chat.services import ChatService
from apps.core.permissions import IsReceptionist, IsStudent


class StudentChatMessagesView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        messages = ChatService.list_student_messages(request.user.student_profile)
        return Response({"success": True, "data": ChatMessageSerializer(messages, many=True).data})

    def post(self, request):
        serializer = ChatMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = ChatService.create_student_message(
            student=request.user.student_profile,
            sender=request.user,
            content=serializer.validated_data["content"],
        )
        return Response(
            {"success": True, "data": ChatMessageSerializer(message).data},
            status=status.HTTP_201_CREATED,
        )


class ReceptionChatThreadListView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        return Response({"success": True, "data": ChatService.list_reception_threads()})


class ReceptionChatThreadMessagesView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)
        messages = ChatService.list_student_messages(student)
        return Response({"success": True, "data": ChatMessageSerializer(messages, many=True).data})


class ReceptionChatReplyView(APIView):
    permission_classes = [IsReceptionist]

    def post(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)
        serializer = ChatMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = ChatService.create_reception_reply(
            student=student,
            sender=request.user,
            content=serializer.validated_data["content"],
        )
        return Response(
            {"success": True, "data": ChatMessageSerializer(message).data},
            status=status.HTTP_201_CREATED,
        )


class ReceptionChatMarkReadView(APIView):
    permission_classes = [IsReceptionist]

    def post(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)
        updated = ChatService.mark_student_messages_read(student=student)
        return Response({"success": True, "data": {"updated": updated}})

