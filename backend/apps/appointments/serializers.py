from rest_framework import serializers

from apps.appointments.models import Appointment, AppointmentStatus


class AppointmentWriteSerializer(serializers.Serializer):
    matric_number = serializers.CharField(max_length=32)
    title = serializers.CharField(max_length=200)
    department = serializers.CharField(required=False, allow_blank=True, default="")
    scheduled_at = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    visit_id = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=AppointmentStatus.choices, required=False, default=AppointmentStatus.SCHEDULED)


class AppointmentListQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=AppointmentStatus.choices, required=False)
    search = serializers.CharField(required=False, allow_blank=True)


class AppointmentDetailSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    matric_number = serializers.CharField(source="student.matric_number", read_only=True)
    visit_number = serializers.CharField(source="visit.visit_number", read_only=True, default=None)
    created_by = serializers.CharField(source="performed_by.username", read_only=True, default=None)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "title",
            "department",
            "scheduled_at",
            "status",
            "notes",
            "student_name",
            "matric_number",
            "visit_number",
            "created_by",
            "reminder_sent",
            "created_at",
            "updated_at",
        )
