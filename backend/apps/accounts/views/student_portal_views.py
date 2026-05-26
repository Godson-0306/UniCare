from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.clinical.models import LabResult, Prescription, StudentMedicalRecord
from apps.clinical.serializers import StudentMedicalRecordSerializer
from apps.core.permissions import IsStudent
from apps.emergency.services import EmergencyService
from apps.notifications.models import Notification
from apps.visits.models import Visit
from apps.visits.serializers import VisitDetailSerializer
from rest_framework import serializers


class StudentBaseView(APIView):
    permission_classes = [IsStudent]

    def get_student_profile(self, request):
        return request.user.student_profile


class StudentPrescriptionsView(StudentBaseView):
    def get(self, request):
        profile = self.get_student_profile(request)
        prescriptions = (
            Prescription.objects.filter(visit__student=profile)
            .select_related("visit")
            .prefetch_related("items")
            .order_by("-created_at")[:50]
        )
        data = [
            {
                "id": str(p.id),
                "prescription_number": p.prescription_number,
                "status": p.status,
                "created_at": p.created_at,
                "items": [
                    {
                        "drug_name": i.drug_name,
                        "dosage": i.dosage,
                        "frequency": i.frequency,
                        "duration": i.duration,
                        "is_dispensed": i.is_dispensed,
                    }
                    for i in p.items.all()
                ],
            }
            for p in prescriptions
        ]
        return Response({"success": True, "data": data})


class StudentLabResultsView(StudentBaseView):
    def get(self, request):
        profile = self.get_student_profile(request)
        results = LabResult.objects.filter(visit__student=profile).select_related("lab_request").order_by("-released_at")
        data = [
            {
                "id": str(r.id),
                "test_name": r.lab_request.test_name,
                "result_summary": r.result_summary,
                "is_abnormal": r.is_abnormal,
                "released_at": r.released_at,
                "file_url": r.result_file.url if r.result_file else None,
            }
            for r in results
        ]
        return Response({"success": True, "data": data})


class StudentAppointmentsView(StudentBaseView):
    def get(self, request):
        profile = self.get_student_profile(request)
        appointments = Appointment.objects.filter(student=profile).order_by("-scheduled_at")
        data = [
            {
                "id": str(a.id),
                "title": a.title,
                "scheduled_at": a.scheduled_at,
                "status": a.status,
                "notes": a.notes,
            }
            for a in appointments
        ]
        return Response({"success": True, "data": data})


class StudentNotificationsView(StudentBaseView):
    def get(self, request):
        profile = self.get_student_profile(request)
        notifications = Notification.objects.filter(student=profile).order_by("-created_at")[:100]
        return Response(
            {
                "success": True,
                "data": [
                    {
                        "id": str(n.id),
                        "type": n.notification_type,
                        "title": n.title,
                        "message": n.message,
                        "is_read": n.is_read,
                        "created_at": n.created_at,
                    }
                    for n in notifications
                ],
            }
        )


class StudentMedicalHistoryView(StudentBaseView):
    def get(self, request):
        profile = self.get_student_profile(request)
        visits = Visit.objects.filter(student=profile).select_related("consultation").order_by("-registered_at")[:30]
        return Response({"success": True, "data": VisitDetailSerializer(visits, many=True).data})


class StudentMedicalProfileView(StudentBaseView):
    def get(self, request):
        profile = self.get_student_profile(request)
        records = (
            StudentMedicalRecord.objects.filter(student=profile, is_active=True)
            .select_related("visit", "performed_by")
            .order_by("-diagnosed_at", "-created_at")
        )
        grouped = {
            "allergies": [],
            "conditions": [],
            "chronic_illnesses": [],
            "deformities": [],
            "special_notes": [],
        }
        for record in StudentMedicalRecordSerializer(records, many=True).data:
            if record["record_type"] == "allergy":
                grouped["allergies"].append(record)
            elif record["record_type"] == "diagnosed_condition":
                grouped["conditions"].append(record)
            elif record["record_type"] == "chronic_illness":
                grouped["chronic_illnesses"].append(record)
            elif record["record_type"] == "deformity":
                grouped["deformities"].append(record)
            else:
                grouped["special_notes"].append(record)

        return Response(
            {
                "success": True,
                "data": {
                    "student": {
                        "id": str(profile.id),
                        "full_name": profile.full_name,
                        "matric_number": profile.matric_number,
                        "medical_notes": profile.medical_notes,
                    },
                    **grouped,
                },
            }
        )


class StudentEmergencyView(StudentBaseView):
    throttle_scope = "student_emergency"

    def post(self, request):
        class EmergencyRequestSerializer(serializers.Serializer):
            description = serializers.CharField(required=False, allow_blank=True, max_length=1000)
            latitude = serializers.DecimalField(required=False, allow_null=True, max_digits=9, decimal_places=6)
            longitude = serializers.DecimalField(required=False, allow_null=True, max_digits=9, decimal_places=6)
            location_label = serializers.CharField(required=False, allow_blank=True, max_length=255)

        serializer = EmergencyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = self.get_student_profile(request)
        event = EmergencyService.trigger_emergency(
            student=profile,
            description=serializer.validated_data.get("description", ""),
            latitude=serializer.validated_data.get("latitude"),
            longitude=serializer.validated_data.get("longitude"),
            location_label=serializer.validated_data.get("location_label", ""),
            performed_by=request.user,
        )
        return Response(
            {
                "success": True,
                "data": {
                    "id": str(event.id),
                    "status": event.status,
                    "dial_triggered": event.dial_triggered,
                    "visit_id": str(event.visit_id) if event.visit_id else None,
                },
            },
            status=status.HTTP_201_CREATED,
        )
