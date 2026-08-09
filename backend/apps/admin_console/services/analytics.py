from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinical.models import LabRequest, LabRequestTest, Prescription
from apps.emergency.models import EmergencyEvent
from apps.visits.models import Consultation, Visit


def build_analytics(*, days: int = 14) -> dict:
    days = max(1, min(days, 90))
    since = timezone.now() - timedelta(days=days)

    most_common_diagnoses = [
        {"diagnosis": row["diagnosis"], "total": row["total"]}
        for row in (
            Consultation.objects.exclude(diagnosis="")
            .values("diagnosis")
            .annotate(total=Count("id"))
            .order_by("-total")[:10]
        )
    ]
    doctor_workload = [
        {"username": row["performed_by__username"] or "unknown", "total": row["total"]}
        for row in (
            Consultation.objects.exclude(performed_by=None)
            .values("performed_by__username")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
    ]
    pharmacy_usage_trends = [
        {"day": row["day"].isoformat() if row["day"] else None, "total": row["total"]}
        for row in (
            Prescription.objects.filter(created_at__gte=since)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("-day")[:days]
        )
    ]
    lab_test_frequency = [
        {"test_name": row["test_name"], "total": row["total"]}
        for row in (
            LabRequestTest.objects.values("test_name").annotate(total=Count("id")).order_by("-total")[:10]
        )
    ]
    emergency_case_frequency = [
        {"day": row["day"].isoformat() if row["day"] else None, "total": row["total"]}
        for row in (
            EmergencyEvent.objects.filter(created_at__gte=since)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("-day")[:days]
        )
    ]

    return {
        "totals": {
            "patient_visits": Visit.objects.count(),
            "appointments": Appointment.objects.count(),
            "prescriptions": Prescription.objects.count(),
            "lab_requests": LabRequest.objects.count(),
            "emergency_cases": EmergencyEvent.objects.count(),
        },
        "most_common_diagnoses": most_common_diagnoses,
        "pharmacy_usage_trends": pharmacy_usage_trends,
        "lab_test_frequency": lab_test_frequency,
        "emergency_case_frequency": emergency_case_frequency,
        "doctor_workload_distribution": doctor_workload,
        "window_days": days,
    }
