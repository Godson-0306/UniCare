from django.db import models

from apps.core.models import TimeStampedModel, UUIDPrimaryKeyModel


class NotificationType(models.TextChoices):
    APPOINTMENT = "appointment", "Appointment"
    PRESCRIPTION = "prescription", "Prescription"
    LAB_RESULT = "lab_result", "Lab Result"
    EMERGENCY = "emergency", "Emergency"
    GENERAL = "general", "General"


class Notification(UUIDPrimaryKeyModel, TimeStampedModel):
    student = models.ForeignKey(
        "accounts.StudentProfile",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=24, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications_notification"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student", "is_read", "created_at"]),
        ]
