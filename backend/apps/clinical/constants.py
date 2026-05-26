from django.db import models


class PrescriptionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PARTIALLY_DISPENSED = "partially_dispensed", "Partially Dispensed"
    DISPENSED = "dispensed", "Dispensed"
    CANCELLED = "cancelled", "Cancelled"


class LabRequestStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class TreatmentScheduleType(models.TextChoices):
    MEDICATION = "medication", "Medication"
    INJECTION = "injection", "Injection"
    FOLLOW_UP = "follow_up", "Follow Up"


class TreatmentScheduleStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
