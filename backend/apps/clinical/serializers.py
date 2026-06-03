from rest_framework import serializers

from apps.clinical.models import LabRequest, LabRequestTest, Prescription, StudentMedicalRecord


class PrescriptionItemWriteSerializer(serializers.Serializer):
    drug_name = serializers.CharField(max_length=200)
    dosage = serializers.CharField(max_length=120)
    frequency = serializers.CharField(max_length=120)
    duration = serializers.CharField(max_length=120)
    quantity = serializers.IntegerField(min_value=1, default=1)
    instructions = serializers.CharField(required=False, allow_blank=True, default="")


class CreatePrescriptionSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = PrescriptionItemWriteSerializer(many=True)


class CreateLabRequestSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField()
    test_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    test_code = serializers.CharField(required=False, allow_blank=True, default="")
    clinical_notes = serializers.CharField(required=False, allow_blank=True, default="")
    tests = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=False)

    def validate(self, attrs):
        has_single_test = bool(attrs.get("test_name", "").strip())
        has_test_list = bool(attrs.get("tests"))
        if not has_single_test and not has_test_list:
            raise serializers.ValidationError("At least one lab test is required.")
        return attrs


class UploadLabResultSerializer(serializers.Serializer):
    result_summary = serializers.CharField(required=False, allow_blank=True, default="")
    is_abnormal = serializers.BooleanField(required=False, default=False)
    tests = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=False)


class SaveLabTestResultSerializer(serializers.Serializer):
    result_value = serializers.CharField(required=False, allow_blank=True, default="")
    reference_range = serializers.CharField(required=False, allow_blank=True, default="")
    comments = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(
        choices=LabRequestTest._meta.get_field("status").choices,
        required=False,
        default="completed",
    )


class TreatmentScheduleWriteSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField()
    schedule_type = serializers.CharField(max_length=16)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    medication_name = serializers.CharField(required=False, allow_blank=True, default="")
    dosage = serializers.CharField(required=False, allow_blank=True, default="")
    frequency = serializers.CharField(required=False, allow_blank=True, default="")
    start_date = serializers.DateField()
    end_date = serializers.DateField(required=False, allow_null=True)
    occurrences_total = serializers.IntegerField(required=False, min_value=1, default=1)
    interval_days = serializers.IntegerField(required=False, min_value=1, default=1)
    schedule_time = serializers.TimeField(required=False, allow_null=True)
    reminder_offset_minutes = serializers.IntegerField(required=False, min_value=0, default=60)


class FollowUpAppointmentWriteSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField()
    title = serializers.CharField(max_length=200, required=False, allow_blank=True, default="Follow-up")
    scheduled_at = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class StudentMedicalRecordSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = StudentMedicalRecord
        fields = (
            "id",
            "student",
            "visit",
            "record_type",
            "title",
            "details",
            "diagnosed_at",
            "is_active",
            "performed_by",
            "performed_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "performed_by", "created_at", "updated_at")


class StudentMedicalRecordWriteSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField(required=False, allow_null=True)
    record_type = serializers.ChoiceField(choices=StudentMedicalRecord._meta.get_field("record_type").choices)
    title = serializers.CharField(max_length=200)
    details = serializers.CharField(required=False, allow_blank=True, default="")
    diagnosed_at = serializers.DateTimeField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=True)


class PrescriptionDetailSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    student_name = serializers.CharField(source="visit.student.full_name", read_only=True)
    matric_number = serializers.CharField(source="visit.student.matric_number", read_only=True)

    class Meta:
        model = Prescription
        fields = (
            "id",
            "prescription_number",
            "status",
            "notes",
            "student_name",
            "matric_number",
            "created_at",
            "dispensed_at",
            "items",
        )

    def get_items(self, obj):
        return [
            {
                "id": str(i.id),
                "drug_name": i.drug_name,
                "dosage": i.dosage,
                "frequency": i.frequency,
                "duration": i.duration,
                "quantity": i.quantity,
                "instructions": i.instructions,
                "is_dispensed": i.is_dispensed,
            }
            for i in obj.items.all()
        ]


class LabRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="visit.student.full_name", read_only=True)
    matric_number = serializers.CharField(source="visit.student.matric_number", read_only=True)
    student_id = serializers.UUIDField(source="visit.student.id", read_only=True)
    visit = serializers.UUIDField(source="visit.id", read_only=True)
    visit_number = serializers.CharField(source="visit.visit_number", read_only=True)
    requested_by = serializers.SerializerMethodField()
    test_count = serializers.SerializerMethodField()
    completed_test_count = serializers.SerializerMethodField()
    tests = serializers.SerializerMethodField()

    class Meta:
        model = LabRequest
        fields = (
            "id",
            "visit",
            "visit_number",
            "request_number",
            "test_name",
            "test_code",
            "status",
            "student_id",
            "student_name",
            "matric_number",
            "requested_by",
            "test_count",
            "completed_test_count",
            "clinical_notes",
            "requested_at",
            "completed_at",
            "tests",
        )

    def get_requested_by(self, obj):
        if not obj.performed_by:
            return ""
        full_name = obj.performed_by.get_full_name()
        return full_name or obj.performed_by.username

    def get_test_count(self, obj):
        prefetched_tests = getattr(obj, "_prefetched_objects_cache", {}).get("tests")
        if prefetched_tests is not None:
            return len(prefetched_tests)
        return obj.tests.count()

    def get_completed_test_count(self, obj):
        prefetched_tests = getattr(obj, "_prefetched_objects_cache", {}).get("tests")
        if prefetched_tests is not None:
            return len([test for test in prefetched_tests if test.status == "completed"])
        return obj.tests.filter(status="completed").count()

    def get_tests(self, obj):
        return LabRequestTestSerializer(obj.tests.all(), many=True).data


class LabRequestTestSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LabRequestTest
        fields = (
            "id",
            "test_name",
            "test_code",
            "result_value",
            "reference_range",
            "comments",
            "status",
            "completed_at",
            "performed_by_name",
            "created_at",
            "updated_at",
        )

    def get_performed_by_name(self, obj):
        if not obj.performed_by:
            return ""
        full_name = obj.performed_by.get_full_name()
        return full_name or obj.performed_by.username
