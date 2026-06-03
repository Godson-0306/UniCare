from django.db import models

from apps.core.models import AuditableModel, UUIDPrimaryKeyModel


class AppointmentStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    CONFIRMED = "confirmed", "Confirmed"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    MISSED = "missed", "Missed"
    ONGOING_TREATMENT = "ongoing_treatment", "Ongoing Treatment"


APPOINTMENT_STATUS_MAX_LENGTH = max(32, max(len(value) for value, _label in AppointmentStatus.choices))


class Appointment(UUIDPrimaryKeyModel, AuditableModel):
    student = models.ForeignKey(
        "accounts.StudentProfile",
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    visit = models.ForeignKey(
        "visits.Visit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
    )
    title = models.CharField(max_length=200)
    department = models.CharField(max_length=120, blank=True)
    scheduled_at = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=APPOINTMENT_STATUS_MAX_LENGTH,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.SCHEDULED,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    reminder_sent = models.BooleanField(default=False)

    class Meta:
        db_table = "appointments_appointment"
        ordering = ["scheduled_at"]
        indexes = [
            models.Index(fields=["student", "scheduled_at"]),
            models.Index(fields=["status", "scheduled_at"]),
        ]
