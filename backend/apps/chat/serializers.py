from rest_framework import serializers

from apps.chat.models import ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = (
            "id",
            "student_id",
            "student_name",
            "sender_id",
            "sender_role",
            "sender_name",
            "content",
            "is_read",
            "created_at",
        )

    def get_sender_id(self, obj):
        return str(obj.sender_id) if obj.sender_id else None

    def get_sender_role(self, obj):
        return obj.sender.role if obj.sender else None

    def get_sender_name(self, obj):
        if not obj.sender:
            return "Unknown"
        if hasattr(obj.sender, "student_profile"):
            return obj.sender.student_profile.full_name
        if hasattr(obj.sender, "workstation_profile"):
            return obj.sender.workstation_profile.station_name
        return obj.sender.get_full_name() or obj.sender.username

    def get_student_id(self, obj):
        return str(obj.student_id) if obj.student_id else None

    def get_student_name(self, obj):
        return obj.student.full_name if obj.student else ""


class ChatMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=4000, trim_whitespace=True)

