from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import StudentProfileSerializer
from apps.clinical.models import StudentMedicalRecord
from apps.appointments.serializers import AppointmentDetailSerializer, AppointmentWriteSerializer
from apps.appointments.services import AppointmentService
from apps.core.permissions import IsReceptionist
from apps.visits.models import Visit
from apps.visits.serializers import CreateVisitSerializer, VisitDetailSerializer
from apps.visits.services.student_search_service import StudentSearchService
from apps.visits.services.visit_service import VisitService


def _serialize_reception_student(student):
    latest_visit = student.visits.order_by("-registered_at").first()
    latest_emergency = student.emergency_events.order_by("-created_at").first()
    return {
        **StudentProfileSerializer(student).data,
        "summary": {
            "previous_visits_count": student.visits.count(),
            "latest_visit": {
                "visit_id": str(latest_visit.id),
                "visit_number": latest_visit.visit_number,
                "status": latest_visit.status,
                "registered_at": latest_visit.registered_at,
            }
            if latest_visit
            else None,
            "verified_flags": list(
                StudentMedicalRecord.objects.filter(student=student, is_active=True)
                .values_list("title", flat=True)[:5]
            ),
            "active_emergency": (
                latest_emergency is not None and latest_emergency.status in {"triggered", "dispatched"}
            ),
        },
    }


class StudentSearchView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        query = request.query_params.get("query") or request.query_params.get("q")
        matric = request.query_params.get("matric")
        name = request.query_params.get("name")
        limit = int(request.query_params.get("limit", 100))
        if query:
            students = StudentSearchService.search(query, limit=limit)
            return Response({"success": True, "data": [_serialize_reception_student(student) for student in students]})
        if matric:
            student = StudentSearchService.search_by_matric(matric)
            return Response({"success": True, "data": [_serialize_reception_student(student)] if student else []})
        if name:
            students = StudentSearchService.search_by_name(name, limit=limit)
            return Response({"success": True, "data": [_serialize_reception_student(student) for student in students]})
        students = StudentSearchService.list_students(limit=limit)
        return Response({"success": True, "data": [_serialize_reception_student(student) for student in students]})


class CreateVisitView(APIView):
    permission_classes = [IsReceptionist]

    def post(self, request):
        serializer = CreateVisitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = StudentSearchService.search_by_matric(serializer.validated_data["matric_number"])
        if not student:
            return Response({"success": False, "error": {"message": "Student not found."}}, status=404)
        visit = VisitService.create_visit(
            student=student,
            chief_complaint=serializer.validated_data["chief_complaint"],
            reception_notes="\n".join(
                part
                for part in [
                    serializer.validated_data.get("symptoms_summary", "").strip(),
                    serializer.validated_data.get("reception_notes", "").strip(),
                ]
                if part
            ),
            priority=serializer.validated_data.get("priority", "normal"),
            performed_by=request.user,
            is_emergency=serializer.validated_data.get("priority") == "emergency",
        )
        return Response(
            {"success": True, "data": VisitDetailSerializer(visit).data},
            status=status.HTTP_201_CREATED,
        )


class CreateAppointmentView(APIView):
    permission_classes = [IsReceptionist]

    def post(self, request):
        serializer = AppointmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = StudentSearchService.search_by_matric(serializer.validated_data["matric_number"])
        if not student:
            return Response({"success": False, "error": {"message": "Student not found."}}, status=404)
        visit = None
        visit_id = serializer.validated_data.get("visit_id")
        if visit_id:
            visit = Visit.objects.get(id=visit_id, student=student)
        appointment = AppointmentService.create_reception_appointment(
            student=student,
            title=serializer.validated_data["title"],
            department=serializer.validated_data.get("department", ""),
            scheduled_at=serializer.validated_data["scheduled_at"],
            notes=serializer.validated_data.get("notes", ""),
            performed_by=request.user,
            visit=visit,
            status=serializer.validated_data.get("status", "scheduled"),
        )
        return Response(
            {"success": True, "data": AppointmentDetailSerializer(appointment).data},
            status=status.HTTP_201_CREATED,
        )
