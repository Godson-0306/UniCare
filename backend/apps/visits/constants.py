from django.db import models


class VisitStatus(models.TextChoices):
    CREATED = "created", "Created"
    IN_NURSE_QUEUE = "in_nurse_queue", "In Nurse Queue"
    VITALS_RECORDED = "vitals_recorded", "Vitals Completed"
    IN_DOCTOR_CONSULTATION = "in_doctor_consultation", "In Doctor Queue"
    CONSULTATION_COMPLETED = "consultation_completed", "Consultation Completed"
    AWAITING_LAB_RESULTS = "awaiting_lab_results", "Awaiting Lab Results"
    LAB_REQUESTED = "lab_requested", "Lab Requested"
    PHARMACY_PROCESSING = "pharmacy_processing", "Pharmacy Processing"
    COMPLETED = "completed", "Completed"
    CLOSED = "closed", "Closed"
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
