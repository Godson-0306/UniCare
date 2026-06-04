from django.db import models
from django.conf import settings

from apps.clinical.constants import (
    LabRequestStatus,
    LabTestStatus,
    PrescriptionStatus,
    TreatmentScheduleStatus,
    TreatmentScheduleType,
)
from apps.core.models import AuditableModel, UUIDPrimaryKeyModel


class MedicalRecordType(models.TextChoices):
    ALLERGY = "allergy", "Allergy"
    DIAGNOSED_CONDITION = "diagnosed_condition", "Diagnosed Condition"
    CHRONIC_ILLNESS = "chronic_illness", "Chronic Illness"
    DEFORMITY = "deformity", "Deformity"
    SPECIAL_NOTE = "special_note", "Special Medical Note"


class StudentMedicalRecord(UUIDPrimaryKeyModel, AuditableModel):
    student = models.ForeignKey(
        "accounts.StudentProfile",
        on_delete=models.CASCADE,
        related_name="verified_medical_records",
    )
    visit = models.ForeignKey(
        "visits.Visit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medical_records",
    )
    record_type = models.CharField(max_length=32, choices=MedicalRecordType.choices, db_index=True)
    title = models.CharField(max_length=200)
    details = models.TextField(blank=True)
    diagnosed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "clinical_student_medical_record"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student", "record_type", "is_active"]),
            models.Index(fields=["visit", "record_type"]),
        ]


class Prescription(UUIDPrimaryKeyModel, AuditableModel):
    visit = models.ForeignKey("visits.Visit", on_delete=models.CASCADE, related_name="prescriptions")
    prescription_number = models.CharField(max_length=32, unique=True, db_index=True)
    status = models.CharField(
        max_length=24,
        choices=PrescriptionStatus.choices,
        default=PrescriptionStatus.PENDING,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    dispensed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "clinical_prescription"
        ordering = ["-created_at"]


class PrescriptionItem(UUIDPrimaryKeyModel, AuditableModel):
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name="items",
    )
    drug_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=120)
    frequency = models.CharField(max_length=120)
    duration = models.CharField(max_length=120)
    quantity = models.PositiveIntegerField(default=1)
    instructions = models.TextField(blank=True)
    is_dispensed = models.BooleanField(default=False)
    dispensed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "clinical_prescription_item"


class LabRequest(UUIDPrimaryKeyModel, AuditableModel):
    visit = models.ForeignKey("visits.Visit", on_delete=models.CASCADE, related_name="lab_requests")
    request_number = models.CharField(max_length=32, unique=True, db_index=True)
    test_name = models.CharField(max_length=200)
    test_code = models.CharField(max_length=64, blank=True)
    clinical_notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=LabRequestStatus.choices,
        default=LabRequestStatus.PENDING,
        db_index=True,
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "clinical_lab_request"
        ordering = ["-requested_at"]


class LabRequestTest(UUIDPrimaryKeyModel, AuditableModel):
    lab_request = models.ForeignKey(
        LabRequest,
        on_delete=models.CASCADE,
        related_name="tests",
    )
    test_name = models.CharField(max_length=200)
    test_code = models.CharField(max_length=64, blank=True)
    result_value = models.TextField(blank=True)
    reference_range = models.CharField(max_length=200, blank=True)
    interpretation = models.TextField(blank=True)
    technician_notes = models.TextField(blank=True)
    comments = models.TextField(blank=True)
    attachment = models.FileField(upload_to="lab_tests/%Y/%m/", blank=True)
    status = models.CharField(
        max_length=16,
        choices=LabTestStatus.choices,
        default=LabTestStatus.PENDING,
        db_index=True,
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "clinical_lab_request_test"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["lab_request", "status"]),
        ]


class LabResult(UUIDPrimaryKeyModel, AuditableModel):
    lab_request = models.OneToOneField(
        LabRequest,
        on_delete=models.CASCADE,
        related_name="result",
    )
    visit = models.ForeignKey("visits.Visit", on_delete=models.CASCADE, related_name="lab_results")
    result_summary = models.TextField()
    result_file = models.FileField(upload_to="lab_results/%Y/%m/", blank=True)
    is_abnormal = models.BooleanField(default=False)
    released_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "clinical_lab_result"
        ordering = ["-released_at"]


class TreatmentSchedule(UUIDPrimaryKeyModel, AuditableModel):
    visit = models.ForeignKey(
        "visits.Visit",
        on_delete=models.CASCADE,
        related_name="treatment_schedules",
    )
    student = models.ForeignKey(
        "accounts.StudentProfile",
        on_delete=models.CASCADE,
        related_name="treatment_schedules",
    )
    schedule_type = models.CharField(max_length=16, choices=TreatmentScheduleType.choices)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    medication_name = models.CharField(max_length=200, blank=True)
    dosage = models.CharField(max_length=120, blank=True)
    frequency = models.CharField(max_length=120, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    next_due_at = models.DateTimeField(null=True, blank=True)
    interval_days = models.PositiveIntegerField(default=1)
    occurrences_total = models.PositiveIntegerField(default=1)
    appointments_generated = models.PositiveIntegerField(default=0)
    reminder_offset_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(
        max_length=16,
        choices=TreatmentScheduleStatus.choices,
        default=TreatmentScheduleStatus.ACTIVE,
    )

    class Meta:
        db_table = "clinical_treatment_schedule"
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["visit", "schedule_type"]),
        ]


class FollowUp(UUIDPrimaryKeyModel, AuditableModel):
    patient = models.ForeignKey(
        "accounts.StudentProfile",
        on_delete=models.CASCADE,
        related_name="follow_ups",
    )
    visit = models.ForeignKey(
        "visits.Visit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="follow_ups",
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_follow_ups",
    )
    follow_up_type = models.CharField(
        max_length=32,
        choices=[
            ("medication_review", "Medication Review"),
            ("lab_review", "Lab Review"),
            ("injection_course", "Injection Course"),
            ("consultation_review", "Consultation Review"),
            ("other", "Other"),
        ],
        default="other",
        db_index=True,
    )
    scheduled_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=[
            ("pending", "Pending"),
            ("completed", "Completed"),
            ("missed", "Missed"),
            ("cancelled", "Cancelled"),
        ],
        default="pending",
        db_index=True,
    )

    class Meta:
        db_table = "clinical_follow_up"
        ordering = ["-scheduled_date", "-created_at"]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["visit", "scheduled_date"]),
        ]
