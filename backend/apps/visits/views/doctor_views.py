from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StudentProfile
from apps.appointments.models import Appointment, AppointmentStatus
from apps.clinical.models import StudentMedicalRecord, TreatmentSchedule
from apps.clinical.serializers import (
    CreateLabRequestSerializer,
    CreatePrescriptionSerializer,
    FollowUpAppointmentWriteSerializer,
    StudentMedicalRecordSerializer,
    StudentMedicalRecordWriteSerializer,
    TreatmentScheduleWriteSerializer,
)
from apps.clinical.services.lab_service import LabService
from apps.clinical.services.medical_profile_service import MedicalProfileService
from apps.clinical.services.prescription_service import PrescriptionService
from apps.core.permissions import IsDoctor
from apps.visits.constants import QueueStage, QueueStatus
from apps.visits.models import Consultation, QueueEntry, Visit
from apps.visits.serializers import ConsultationWriteSerializer, QueueEntrySerializer, VisitDetailSerializer


class DoctorQueueView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        entries = (
            QueueEntry.objects.filter(stage=QueueStage.DOCTOR, status=QueueStatus.WAITING)
            .select_related("visit", "visit__student")
            .order_by("position", "created_at")
        )
        return Response({"success": True, "data": QueueEntrySerializer(entries, many=True).data})


class VisitDetailView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, visit_id):
        visit = Visit.objects.select_related("student", "consultation").prefetch_related("vitals_records").get(id=visit_id)
        return Response({"success": True, "data": VisitDetailSerializer(visit).data})


class StudentMedicalHistoryView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, student_id):
        student = StudentProfile.objects.get(id=student_id)
        visits = Visit.objects.filter(student=student).select_related("consultation").order_by("-registered_at")[:50]
        return Response({"success": True, "data": VisitDetailSerializer(visits, many=True).data})


class StudentMedicalProfileView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, student_id):
        student = StudentProfile.objects.get(id=student_id)
        records = StudentMedicalRecord.objects.filter(student=student).select_related("visit", "performed_by")
        return Response(
            {
                "success": True,
                "data": {
                    "student": {
                        "id": str(student.id),
                        "full_name": student.full_name,
                        "matric_number": student.matric_number,
                        "medical_notes": student.medical_notes,
                    },
                    "records": StudentMedicalRecordSerializer(records, many=True).data,
                },
            }
        )


class StudentMedicalRecordCreateView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, student_id):
        student = StudentProfile.objects.get(id=student_id)
        serializer = StudentMedicalRecordWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = None
        visit_id = serializer.validated_data.get("visit_id")
        if visit_id:
            visit = Visit.objects.get(id=visit_id, student=student)
        record = MedicalProfileService.create_record(
            student=student,
            visit=visit,
            record_type=serializer.validated_data["record_type"],
            title=serializer.validated_data["title"],
            details=serializer.validated_data.get("details", ""),
            diagnosed_at=serializer.validated_data.get("diagnosed_at"),
            is_active=serializer.validated_data.get("is_active", True),
            performed_by=request.user,
        )
        return Response({"success": True, "data": StudentMedicalRecordSerializer(record).data}, status=status.HTTP_201_CREATED)


class StudentMedicalRecordUpdateView(APIView):
    permission_classes = [IsDoctor]

    def patch(self, request, record_id):
        record = StudentMedicalRecord.objects.select_related("student", "visit").get(id=record_id)
        serializer = StudentMedicalRecordWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updates = serializer.validated_data.copy()
        visit_id = updates.pop("visit_id", None)
        if visit_id:
            updates["visit"] = Visit.objects.get(id=visit_id, student=record.student)
        updated = MedicalProfileService.update_record(record=record, performed_by=request.user, **updates)
        return Response({"success": True, "data": StudentMedicalRecordSerializer(updated).data})


class SaveConsultationView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        serializer = ConsultationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = Visit.objects.get(id=serializer.validated_data["visit_id"])
        consultation, _ = Consultation.objects.update_or_create(
            visit=visit,
            defaults={
                "subjective": serializer.validated_data.get("subjective", ""),
                "objective": serializer.validated_data.get("objective", ""),
                "assessment": serializer.validated_data.get("assessment", ""),
                "plan": serializer.validated_data.get("plan", ""),
                "diagnosis": serializer.validated_data.get("diagnosis", ""),
                "follow_up_notes": serializer.validated_data.get("follow_up_notes", ""),
                "performed_by": request.user,
            },
        )
        return Response({"success": True, "data": {"consultation_id": str(consultation.id)}})


class CreatePrescriptionView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        serializer = CreatePrescriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = Visit.objects.get(id=serializer.validated_data["visit_id"])
        prescription = PrescriptionService.create_prescription(
            visit=visit,
            items=serializer.validated_data["items"],
            notes=serializer.validated_data.get("notes", ""),
            performed_by=request.user,
        )
        return Response(
            {"success": True, "data": {"prescription_id": str(prescription.id), "number": prescription.prescription_number}},
            status=status.HTTP_201_CREATED,
        )


class CreateLabRequestView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        serializer = CreateLabRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = Visit.objects.get(id=serializer.validated_data["visit_id"])
        lab_request = LabService.create_request(
            visit=visit,
            test_name=serializer.validated_data["test_name"],
            test_code=serializer.validated_data.get("test_code", ""),
            notes=serializer.validated_data.get("clinical_notes", ""),
            performed_by=request.user,
        )
        return Response(
            {"success": True, "data": {"lab_request_id": str(lab_request.id), "number": lab_request.request_number}},
            status=status.HTTP_201_CREATED,
        )


class CreateTreatmentScheduleView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        serializer = TreatmentScheduleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = Visit.objects.select_related("student").get(id=serializer.validated_data["visit_id"])
        schedule = TreatmentSchedule.objects.create(
            visit=visit,
            student=visit.student,
            schedule_type=serializer.validated_data["schedule_type"],
            title=serializer.validated_data["title"],
            description=serializer.validated_data.get("description", ""),
            medication_name=serializer.validated_data.get("medication_name", ""),
            dosage=serializer.validated_data.get("dosage", ""),
            frequency=serializer.validated_data.get("frequency", ""),
            start_date=serializer.validated_data["start_date"],
            end_date=serializer.validated_data.get("end_date"),
            performed_by=request.user,
        )
        return Response({"success": True, "data": {"id": str(schedule.id)}}, status=status.HTTP_201_CREATED)


class CreateFollowUpAppointmentView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        serializer = FollowUpAppointmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = Visit.objects.select_related("student").get(id=serializer.validated_data["visit_id"])
        appointment = Appointment.objects.create(
            student=visit.student,
            visit=visit,
            title=serializer.validated_data.get("title", "Follow-up"),
            scheduled_at=serializer.validated_data["scheduled_at"],
            notes=serializer.validated_data.get("notes", ""),
            performed_by=request.user,
            status=AppointmentStatus.SCHEDULED,
        )
        return Response({"success": True, "data": {"appointment_id": str(appointment.id)}}, status=status.HTTP_201_CREATED)
