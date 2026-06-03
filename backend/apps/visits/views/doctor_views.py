from django.db import transaction
from django.db.models import Max
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StudentProfile
from apps.appointments.services import AppointmentService
from apps.audit.services import AuditService
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
from apps.clinical.services.timeline_service import TimelineService
from apps.clinical.services.treatment_plan_service import TreatmentPlanService
from apps.core.permissions import IsDoctor
from apps.core.realtime import RealtimeEventService
from apps.visits.constants import QueueStage, QueueStatus, VisitStatus
from apps.visits.models import Consultation, QueueEntry, Visit
from apps.visits.serializers import ConsultationWriteSerializer, DoctorQueueEntrySerializer, VisitDetailSerializer
from apps.visits.services.visit_service import VisitService


class DoctorQueueView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        entries = (
            QueueEntry.objects.filter(stage=QueueStage.DOCTOR, status=QueueStatus.WAITING)
            .annotate(vitals_completed_sort=Max("visit__vitals_records__created_at"))
            .select_related("visit", "visit__student")
            .prefetch_related("visit__vitals_records", "visit__queue_entries")
            .order_by("vitals_completed_sort", "created_at")
        )
        return Response({"success": True, "data": DoctorQueueEntrySerializer(entries, many=True).data})


class VisitDetailView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, visit_id):
        visit = Visit.objects.select_related("student", "consultation").prefetch_related("vitals_records").get(id=visit_id)
        AuditService.log_access(
            performed_by=request.user,
            entity_type="visit",
            entity_id=str(visit.id),
            visit=visit,
            metadata={"student_id": str(visit.student_id)},
        )
        return Response({"success": True, "data": VisitDetailSerializer(visit).data})


class StudentMedicalHistoryView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, student_id):
        student = StudentProfile.objects.get(id=student_id)
        visits = Visit.objects.filter(student=student).select_related("consultation").order_by("-registered_at")[:50]
        AuditService.log_access(
            performed_by=request.user,
            entity_type="student_medical_history",
            entity_id=str(student.id),
            metadata={"count": visits.count()},
        )
        return Response({"success": True, "data": VisitDetailSerializer(visits, many=True).data})


class StudentMedicalProfileView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, student_id):
        student = StudentProfile.objects.get(id=student_id)
        records = StudentMedicalRecord.objects.filter(student=student).select_related("visit", "performed_by")
        AuditService.log_access(
            performed_by=request.user,
            entity_type="student_medical_profile",
            entity_id=str(student.id),
            metadata={"count": records.count()},
        )
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


class StudentTimelineView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, student_id):
        student = StudentProfile.objects.get(id=student_id)
        AuditService.log_access(
            performed_by=request.user,
            entity_type="student_timeline",
            entity_id=str(student.id),
        )
        return Response({"success": True, "data": TimelineService.build_for_student(student)})


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

    @transaction.atomic
    def post(self, request):
        serializer = ConsultationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = Visit.objects.select_related("student").get(id=serializer.validated_data["visit_id"])
        physical_exam = serializer.validated_data.get("physical_exam", {})
        treatment_plan = serializer.validated_data.get("treatment_plan", {})
        diagnosis = serializer.validated_data.get("primary_diagnosis") or serializer.validated_data.get("diagnosis", "")
        assessment = _format_assessment(serializer.validated_data)
        plan = _format_treatment_plan(treatment_plan, serializer.validated_data.get("outcome", ""))
        consultation, _ = Consultation.objects.update_or_create(
            visit=visit,
            defaults={
                "subjective": serializer.validated_data.get("hpi") or serializer.validated_data.get("subjective", ""),
                "objective": _format_physical_exam(physical_exam) or serializer.validated_data.get("objective", ""),
                "assessment": assessment or serializer.validated_data.get("assessment", ""),
                "plan": plan or serializer.validated_data.get("plan", ""),
                "diagnosis": diagnosis,
                "follow_up_notes": serializer.validated_data.get("follow_up_notes", ""),
                "performed_by": request.user,
            },
        )
        doctor_entry = (
            QueueEntry.objects.filter(
                visit=visit,
                stage=QueueStage.DOCTOR,
                status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
            )
            .order_by("created_at")
            .first()
        )
        if doctor_entry:
            VisitService.complete_queue_entry(doctor_entry, request.user, notes="Consultation completed")

        lab_request = None
        structured_investigations = _normalize_investigations(serializer.validated_data.get("investigations", []))
        requested_tests = structured_investigations or [
            {"test_name": test_name, "priority": "routine", "clinical_notes": ""}
            for test_name in _parse_requested_lab_tests(serializer.validated_data.get("requested_lab_tests", ""))
        ]
        if requested_tests:
            lab_request = LabService.create_request(
                visit=visit,
                tests=[{"test_name": item["test_name"], "test_code": ""} for item in requested_tests],
                notes=_format_investigation_notes(consultation.id, requested_tests),
                performed_by=request.user,
            )
        prescription = None
        prescription_items = _normalize_prescriptions(serializer.validated_data.get("prescriptions", []))
        if prescription_items:
            prescription = PrescriptionService.create_prescription(
                visit=visit,
                items=prescription_items,
                notes=f"Created during consultation {consultation.id}",
                performed_by=request.user,
            )
        appointment = None
        if serializer.validated_data.get("follow_up_required") and serializer.validated_data.get("follow_up_date"):
            appointment = AppointmentService.create_follow_up(
                visit=visit,
                title="Follow-up consultation",
                scheduled_at=serializer.validated_data["follow_up_date"],
                notes=serializer.validated_data.get("follow_up_notes", ""),
                performed_by=request.user,
            )

        if lab_request:
            VisitService.transition_status(
                visit,
                VisitStatus.AWAITING_LAB_RESULTS,
                performed_by=request.user,
                metadata={"lab_request_count": 1, "lab_test_count": len(requested_tests), "prescription_count": 1 if prescription else 0},
            )
        elif prescription:
            VisitService.recalculate_visit_status(visit, performed_by=request.user)
        else:
            VisitService.transition_status(visit, VisitStatus.CONSULTATION_COMPLETED, performed_by=request.user)

        AuditService.log(
            action="consultation_saved",
            entity_type="consultation",
            entity_id=str(consultation.id),
            performed_by=request.user,
            visit=visit,
            metadata={
                "lab_request_count": 1 if lab_request else 0,
                "lab_test_count": len(requested_tests),
                "prescription_count": len(prescription_items),
                "follow_up_created": bool(appointment),
                "outcome": serializer.validated_data.get("outcome", ""),
            },
        )
        RealtimeEventService.publish_to_staff(
            "consultation.saved",
            {
                "visit_id": str(visit.id),
                "visit_number": visit.visit_number,
                "student": visit.student.full_name,
                "status": visit.status,
                "lab_request_count": 1 if lab_request else 0,
                "lab_test_count": len(requested_tests),
                "prescription_count": len(prescription_items),
            },
        )
        return Response(
            {
                "success": True,
                "data": {
                    "consultation_id": str(consultation.id),
                    "visit_status": visit.status,
                    "prescription_id": str(prescription.id) if prescription else None,
                    "appointment_id": str(appointment.id) if appointment else None,
                    "lab_requests": [
                        {
                            "id": str(lab_request.id),
                            "request_number": lab_request.request_number,
                            "test_count": len(requested_tests),
                            "tests": [item["test_name"] for item in requested_tests],
                        }
                    ]
                    if lab_request
                    else [],
                },
            }
        )


def _parse_requested_lab_tests(raw_value: str) -> list[str]:
    seen: set[str] = set()
    tests: list[str] = []
    for line in raw_value.splitlines():
        test_name = line.strip(" \t,;")
        if not test_name:
            continue
        normalized = test_name.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        tests.append(test_name)
    return tests


def _format_physical_exam(physical_exam: dict) -> str:
    labels = {
        "general_appearance": "General Appearance",
        "heent": "HEENT",
        "cardiovascular": "Cardiovascular",
        "respiratory": "Respiratory",
        "abdominal": "Abdominal",
        "neurological": "Neurological",
        "musculoskeletal": "Musculoskeletal",
        "additional_findings": "Additional Findings",
    }
    return "\n".join(f"{label}: {physical_exam.get(key, '')}" for key, label in labels.items() if physical_exam.get(key, ""))


def _format_assessment(data: dict) -> str:
    parts = [
        ("Primary Diagnosis", data.get("primary_diagnosis", "")),
        ("Secondary Diagnosis", data.get("secondary_diagnosis", "")),
        ("Differential Diagnosis", data.get("differential_diagnosis", "")),
        ("ICD-10 Code", data.get("icd10_code", "")),
    ]
    return "\n".join(f"{label}: {value}" for label, value in parts if value)


def _format_treatment_plan(treatment_plan: dict, outcome: str) -> str:
    labels = {
        "management_plan": "Clinical Management Plan",
        "lifestyle_advice": "Lifestyle Advice",
        "diet_recommendations": "Diet Recommendations",
        "monitoring_instructions": "Monitoring Instructions",
        "home_care_instructions": "Home Care Instructions",
    }
    lines = [f"{label}: {treatment_plan.get(key, '')}" for key, label in labels.items() if treatment_plan.get(key, "")]
    if outcome:
        lines.append(f"Outcome: {outcome}")
    return "\n".join(lines)


def _normalize_investigations(investigations: list[dict]) -> list[dict]:
    normalized = []
    seen: set[str] = set()
    for item in investigations:
        test_name = str(item.get("test_name", "")).strip()
        if not test_name:
            continue
        key = test_name.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(
            {
                "test_name": test_name,
                "priority": str(item.get("priority", "routine")).strip() or "routine",
                "clinical_notes": str(item.get("clinical_notes", "")).strip(),
            }
        )
    return normalized


def _format_investigation_notes(consultation_id, investigations: list[dict]) -> str:
    lines = [f"Requested during consultation {consultation_id}"]
    for item in investigations:
        note = item.get("clinical_notes", "")
        lines.append(f"{item['test_name']} ({item.get('priority', 'routine')}): {note}")
    return "\n".join(lines)


def _normalize_prescriptions(prescriptions: list[dict]) -> list[dict]:
    normalized = []
    for item in prescriptions:
        drug_name = str(item.get("medication", item.get("drug_name", ""))).strip()
        if not drug_name:
            continue
        try:
            quantity = int(item.get("quantity") or 1)
        except (TypeError, ValueError):
            quantity = 1
        normalized.append(
            {
                "drug_name": drug_name,
                "dosage": str(item.get("dosage", "")).strip(),
                "frequency": str(item.get("frequency", "")).strip(),
                "duration": str(item.get("duration", "")).strip(),
                "quantity": max(quantity, 1),
                "instructions": str(item.get("instructions", "")).strip(),
            }
        )
    return normalized


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
        tests = serializer.validated_data.get("tests")
        lab_request = LabService.create_request(
            visit=visit,
            test_name=serializer.validated_data.get("test_name", ""),
            test_code=serializer.validated_data.get("test_code", ""),
            notes=serializer.validated_data.get("clinical_notes", ""),
            performed_by=request.user,
            tests=tests,
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
        schedule = TreatmentPlanService.create_plan(
            visit=visit,
            schedule_type=serializer.validated_data["schedule_type"],
            title=serializer.validated_data["title"],
            description=serializer.validated_data.get("description", ""),
            medication_name=serializer.validated_data.get("medication_name", ""),
            dosage=serializer.validated_data.get("dosage", ""),
            frequency=serializer.validated_data.get("frequency", ""),
            start_date=serializer.validated_data["start_date"],
            end_date=serializer.validated_data.get("end_date"),
            occurrences_total=serializer.validated_data.get("occurrences_total", 1),
            interval_days=serializer.validated_data.get("interval_days", 1),
            schedule_time=serializer.validated_data.get("schedule_time"),
            reminder_offset_minutes=serializer.validated_data.get("reminder_offset_minutes", 60),
            performed_by=request.user,
        )
        return Response({"success": True, "data": {"id": str(schedule.id)}}, status=status.HTTP_201_CREATED)


class CreateFollowUpAppointmentView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        serializer = FollowUpAppointmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = Visit.objects.select_related("student").get(id=serializer.validated_data["visit_id"])
        appointment = AppointmentService.create_follow_up(
            visit=visit,
            title=serializer.validated_data.get("title", "Follow-up"),
            scheduled_at=serializer.validated_data["scheduled_at"],
            notes=serializer.validated_data.get("notes", ""),
            performed_by=request.user,
        )
        return Response({"success": True, "data": {"appointment_id": str(appointment.id)}}, status=status.HTTP_201_CREATED)
