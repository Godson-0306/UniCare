from django.db import models


class VisitStatus(models.TextChoices):
    REGISTERED = "registered", "Registered"
    AT_NURSE = "at_nurse", "At Nurse"
    AT_DOCTOR = "at_doctor", "At Doctor"
    AWAITING_PHARMACY = "awaiting_pharmacy", "Awaiting Pharmacy"
    AWAITING_LAB = "awaiting_lab", "Awaiting Lab"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class VisitPriority(models.TextChoices):
    NORMAL = "normal", "Normal"
    URGENT = "urgent", "Urgent"
    EMERGENCY = "emergency", "Emergency"


class QueueStage(models.TextChoices):
    RECEPTION = "reception", "Reception"
    NURSE = "nurse", "Nurse"
    DOCTOR = "doctor", "Doctor"
    PHARMACY = "pharmacy", "Pharmacy"
    LAB = "lab", "Lab"


class QueueStatus(models.TextChoices):
    WAITING = "waiting", "Waiting"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    SKIPPED = "skipped", "Skipped"
