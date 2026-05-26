from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import StudentProfileSerializer
from apps.appointments.models import Appointment, AppointmentStatus
from apps.core.permissions import IsReceptionist
from apps.visits.serializers import CreateVisitSerializer, VisitDetailSerializer
from apps.visits.services.student_search_service import StudentSearchService
from apps.visits.services.visit_service import VisitService


class StudentSearchView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        matric = request.query_params.get("matric")
        name = request.query_params.get("name")
        if matric:
            student = StudentSearchService.search_by_matric(matric)
            if not student:
                return Response({"success": False, "error": {"message": "Student not found."}}, status=404)
            return Response({"success": True, "data": StudentProfileSerializer(student).data})
        if name:
            students = StudentSearchService.search_by_name(name)
            return Response(
                {"success": True, "data": StudentProfileSerializer(students, many=True).data}
            )
        return Response({"success": False, "error": {"message": "Provide matric or name query."}}, status=400)


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
            reception_notes=serializer.validated_data.get("reception_notes", ""),
            performed_by=request.user,
        )
        return Response(
            {"success": True, "data": VisitDetailSerializer(visit).data},
            status=status.HTTP_201_CREATED,
        )


class CreateAppointmentView(APIView):
    permission_classes = [IsReceptionist]

    def post(self, request):
        student = StudentSearchService.search_by_matric(request.data.get("matric_number", ""))
        if not student:
            return Response({"success": False, "error": {"message": "Student not found."}}, status=404)
        appointment = Appointment.objects.create(
            student=student,
            title=request.data.get("title", "Clinic Appointment"),
            department=request.data.get("department", ""),
            scheduled_at=request.data["scheduled_at"],
            notes=request.data.get("notes", ""),
            performed_by=request.user,
            status=AppointmentStatus.SCHEDULED,
        )
        return Response(
            {
                "success": True,
                "data": {
                    "id": str(appointment.id),
                    "scheduled_at": appointment.scheduled_at,
                    "status": appointment.status,
                },
            },
            status=status.HTTP_201_CREATED,
        )
