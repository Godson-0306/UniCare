from django.db import models

from apps.core.models import AuditableModel, UUIDPrimaryKeyModel


class EmergencyStatus(models.TextChoices):
    TRIGGERED = "triggered", "Triggered"
    DISPATCHED = "dispatched", "Dispatched"
    RESOLVED = "resolved", "Resolved"
    CANCELLED = "cancelled", "Cancelled"


class EmergencyEvent(UUIDPrimaryKeyModel, AuditableModel):
    student = models.ForeignKey(
        "accounts.StudentProfile",
        on_delete=models.CASCADE,
        related_name="emergency_events",
    )
    visit = models.ForeignKey(
        "visits.Visit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emergency_events",
    )
    status = models.CharField(
        max_length=16,
        choices=EmergencyStatus.choices,
        default=EmergencyStatus.TRIGGERED,
        db_index=True,
    )
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_label = models.CharField(max_length=255, blank=True)
    dial_triggered = models.BooleanField(default=False)
    dial_triggered_at = models.DateTimeField(null=True, blank=True)
    priority_override = models.BooleanField(default=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "emergency_event"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]
