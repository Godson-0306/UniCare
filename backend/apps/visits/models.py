from django.conf import settings
from django.db import models

from apps.core.models import AuditableModel, UUIDPrimaryKeyModel
from apps.visits.constants import QueueStage, QueueStatus, VisitPriority, VisitStatus


class Visit(UUIDPrimaryKeyModel, AuditableModel):
    student = models.ForeignKey(
        "accounts.StudentProfile",
        on_delete=models.PROTECT,
        related_name="visits",
    )
    visit_number = models.CharField(max_length=32, unique=True, db_index=True)
    status = models.CharField(
        max_length=32,
        choices=VisitStatus.choices,
        default=VisitStatus.CREATED,
        db_index=True,
    )
    priority = models.CharField(
        max_length=16,
        choices=VisitPriority.choices,
        default=VisitPriority.NORMAL,
        db_index=True,
    )
    chief_complaint = models.TextField(blank=True)
    reception_notes = models.TextField(blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_emergency = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "visits_visit"
        ordering = ["-registered_at"]
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["student", "registered_at"]),
        ]

    def __str__(self):
        return self.visit_number


class ReceptionLog(UUIDPrimaryKeyModel, AuditableModel):
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="reception_logs")
    notes = models.TextField()
    assigned_nurse_queue = models.BooleanField(default=True)

    class Meta:
        db_table = "visits_reception_log"
        ordering = ["-created_at"]


class QueueEntry(UUIDPrimaryKeyModel, AuditableModel):
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="queue_entries")
    stage = models.CharField(max_length=16, choices=QueueStage.choices, db_index=True)
    status = models.CharField(
        max_length=16,
        choices=QueueStatus.choices,
        default=QueueStatus.WAITING,
        db_index=True,
    )
    position = models.PositiveIntegerField(default=0)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_queue_entries",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "visits_queue_entry"
        ordering = ["position", "created_at"]
        indexes = [
            models.Index(fields=["stage", "status", "position"]),
            models.Index(fields=["visit", "stage"]),
        ]


class Vitals(UUIDPrimaryKeyModel, AuditableModel):
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="vitals_records")
    temperature_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    blood_pressure_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    pulse_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    spo2 = models.PositiveSmallIntegerField(null=True, blank=True)
    intake_notes = models.TextField(blank=True)

    class Meta:
        db_table = "visits_vitals"
        ordering = ["-created_at"]


class Consultation(UUIDPrimaryKeyModel, AuditableModel):
    visit = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name="consultation")
    subjective = models.TextField(blank=True)
    objective = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    follow_up_notes = models.TextField(blank=True)

    class Meta:
        db_table = "visits_consultation"
