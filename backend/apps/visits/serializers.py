from rest_framework import serializers

from apps.accounts.serializers import StudentProfileSerializer
from apps.visits.models import Consultation, QueueEntry, Visit, Vitals


class VitalsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vitals
        fields = (
            "id",
            "temperature_c",
            "blood_pressure_systolic",
            "blood_pressure_diastolic",
            "pulse_rate",
            "respiratory_rate",
            "weight_kg",
            "height_cm",
            "spo2",
            "intake_notes",
            "created_at",
            "performed_by",
        )
        read_only_fields = ("id", "created_at", "performed_by")


class ConsultationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consultation
        fields = (
            "id",
            "subjective",
            "objective",
            "assessment",
            "plan",
            "diagnosis",
            "follow_up_notes",
            "created_at",
            "updated_at",
        )


class QueueEntrySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="visit.student.full_name", read_only=True)
    matric_number = serializers.CharField(source="visit.student.matric_number", read_only=True)
    visit_number = serializers.CharField(source="visit.visit_number", read_only=True)

    class Meta:
        model = QueueEntry
        fields = (
            "id",
            "visit",
            "visit_number",
            "student_name",
            "matric_number",
            "stage",
            "status",
            "position",
            "started_at",
            "completed_at",
            "notes",
            "created_at",
        )


class VisitDetailSerializer(serializers.ModelSerializer):
    student = StudentProfileSerializer(read_only=True)
    vitals_records = VitalsSerializer(many=True, read_only=True)
    consultation = ConsultationSerializer(read_only=True)

    class Meta:
        model = Visit
        fields = (
            "id",
            "visit_number",
            "student",
            "status",
            "priority",
            "chief_complaint",
            "reception_notes",
            "is_emergency",
            "registered_at",
            "completed_at",
            "vitals_records",
            "consultation",
            "created_at",
            "updated_at",
        )


class CreateVisitSerializer(serializers.Serializer):
    matric_number = serializers.CharField(max_length=32)
    chief_complaint = serializers.CharField()
    reception_notes = serializers.CharField(required=False, allow_blank=True, default="")


class RecordVitalsSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField()
    temperature_c = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    blood_pressure_systolic = serializers.IntegerField(required=False, allow_null=True)
    blood_pressure_diastolic = serializers.IntegerField(required=False, allow_null=True)
    pulse_rate = serializers.IntegerField(required=False, allow_null=True)
    respiratory_rate = serializers.IntegerField(required=False, allow_null=True)
    weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    height_cm = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    spo2 = serializers.IntegerField(required=False, allow_null=True)
    intake_notes = serializers.CharField(required=False, allow_blank=True, default="")


class ConsultationWriteSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField()
    subjective = serializers.CharField(required=False, allow_blank=True)
    objective = serializers.CharField(required=False, allow_blank=True)
    assessment = serializers.CharField(required=False, allow_blank=True)
    plan = serializers.CharField(required=False, allow_blank=True)
    diagnosis = serializers.CharField(required=False, allow_blank=True)
    follow_up_notes = serializers.CharField(required=False, allow_blank=True)
