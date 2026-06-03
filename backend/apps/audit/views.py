from django.db.models import Count
from django.db.models.functions import TruncDate
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog
from apps.appointments.models import Appointment
from apps.clinical.models import LabRequest, LabRequestTest, Prescription
from apps.core.permissions import IsAdminUser
from apps.emergency.models import EmergencyEvent
from apps.visits.models import Consultation, Visit


class AuditLogListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        logs = AuditLog.objects.select_related("performed_by", "visit").order_by("-created_at")[:200]
        return Response(
            {
                "success": True,
                "data": [
                    {
                        "id": str(log.id),
                        "action": log.action,
                        "entity_type": log.entity_type,
                        "entity_id": log.entity_id,
                        "performed_by": log.performed_by.username if log.performed_by else None,
                        "workstation_name": log.workstation_name,
                        "role": log.role,
                        "visit_id": str(log.visit_id) if log.visit_id else None,
                        "emergency_event_id": str(log.emergency_event_id) if log.emergency_event_id else None,
                        "metadata": log.metadata,
                        "created_at": log.created_at,
                    }
                    for log in logs
                ],
            }
        )


class AnalyticsDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        most_common_diagnoses = list(
            Consultation.objects.exclude(diagnosis="")
            .values("diagnosis")
            .annotate(total=Count("id"))
            .order_by("-total")[:10]
        )
        doctor_workload = list(
            Consultation.objects.exclude(performed_by=None)
            .values("performed_by__username")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
        pharmacy_usage_trends = list(
            Prescription.objects.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("-day")[:14]
        )
        lab_test_frequency = list(LabRequestTest.objects.values("test_name").annotate(total=Count("id")).order_by("-total")[:10])
        emergency_case_frequency = list(
            EmergencyEvent.objects.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("-day")[:14]
        )

        return Response(
            {
                "success": True,
                "data": {
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
                },
            }
        )
