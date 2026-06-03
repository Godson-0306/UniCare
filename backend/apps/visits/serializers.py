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


class NurseQueueVisitSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    matric_number = serializers.CharField(source="student.matric_number", read_only=True)
    nurse_queue_entry_id = serializers.SerializerMethodField()
    nurse_queue_status = serializers.SerializerMethodField()

    class Meta:
        model = Visit
        fields = (
            "id",
            "visit_number",
            "student_name",
            "matric_number",
            "status",
            "priority",
            "chief_complaint",
            "registered_at",
            "created_at",
            "nurse_queue_entry_id",
            "nurse_queue_status",
        )

    def _get_active_nurse_entry(self, obj: Visit) -> QueueEntry | None:
        prefetched_entries = getattr(obj, "active_nurse_entries", None)
        if prefetched_entries is not None:
            return prefetched_entries[0] if prefetched_entries else None
        return (
            obj.queue_entries.filter(stage="nurse", status__in=["waiting", "in_progress"])
            .order_by("created_at")
            .first()
        )

    def get_nurse_queue_entry_id(self, obj: Visit):
        entry = self._get_active_nurse_entry(obj)
        return str(entry.id) if entry else None

    def get_nurse_queue_status(self, obj: Visit):
        entry = self._get_active_nurse_entry(obj)
        return entry.status if entry else None


class DoctorQueueEntrySerializer(serializers.ModelSerializer):
    student_id = serializers.UUIDField(source="visit.student.id", read_only=True)
    student_name = serializers.CharField(source="visit.student.full_name", read_only=True)
    matric_number = serializers.CharField(source="visit.student.matric_number", read_only=True)
    visit_number = serializers.CharField(source="visit.visit_number", read_only=True)
    visit_priority = serializers.CharField(source="visit.priority", read_only=True)
    vitals_completed_at = serializers.SerializerMethodField()

    class Meta:
        model = QueueEntry
        fields = (
            "id",
            "visit",
            "visit_number",
            "student_id",
            "student_name",
            "matric_number",
            "visit_priority",
            "position",
            "created_at",
            "vitals_completed_at",
        )

    def get_vitals_completed_at(self, obj: QueueEntry):
        latest_vitals = obj.visit.vitals_records.order_by("-created_at").first()
        if latest_vitals:
            return latest_vitals.created_at
        nurse_entry = (
            obj.visit.queue_entries.filter(stage="nurse", status="completed")
            .order_by("-completed_at", "-created_at")
            .first()
        )
        return nurse_entry.completed_at if nurse_entry else obj.created_at


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
    symptoms_summary = serializers.CharField(required=False, allow_blank=True, default="")
    priority = serializers.ChoiceField(choices=["normal", "urgent", "emergency"], required=False, default="normal")
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
    requested_lab_tests = serializers.CharField(required=False, allow_blank=True, default="")
    hpi = serializers.CharField(required=False, allow_blank=True, default="")
    physical_exam = serializers.DictField(required=False, default=dict)
    primary_diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    secondary_diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    differential_diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    icd10_code = serializers.CharField(required=False, allow_blank=True, default="")
    investigations = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    prescriptions = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    treatment_plan = serializers.DictField(required=False, default=dict)
    follow_up_required = serializers.BooleanField(required=False, default=False)
    follow_up_date = serializers.DateTimeField(required=False, allow_null=True)
    outcome = serializers.CharField(required=False, allow_blank=True, default="")
