from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.serializers import (
    AppointmentDetailSerializer,
    AppointmentListQuerySerializer,
    AppointmentUpdateSerializer,
)
from apps.appointments.models import Appointment
from apps.core.permissions import IsHospitalStaff, assert_staff_can_access_visit
from apps.appointments.services import AppointmentService
from apps.appointments.serializers import AppointmentWriteSerializer
from apps.accounts.models import StudentProfile
from rest_framework import status
from rest_framework.exceptions import NotFound


class AppointmentListView(APIView):
    permission_classes = [IsHospitalStaff]

    def get(self, request):
        serializer = AppointmentListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        appointments = AppointmentService.list_for_user(
            user=request.user,
            status=serializer.validated_data.get("status"),
            search=serializer.validated_data.get("search", ""),
        )
        return Response({"success": True, "data": AppointmentDetailSerializer(appointments, many=True).data})


class AppointmentCreateView(APIView):
    permission_classes = [IsHospitalStaff]

    def post(self, request):
        serializer = AppointmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        student = get_object_or_404(StudentProfile, matric_number=data["matric_number"])

        visit = None
        visit_id = data.get("visit_id")
        if visit_id:
            from apps.visits.models import Visit

            visit = get_object_or_404(Visit, id=visit_id)
            assert_staff_can_access_visit(request.user, visit)

        appointment = AppointmentService.create_reception_appointment(
            student=student,
            title=data["title"],
            department=data.get("department", ""),
            scheduled_at=data["scheduled_at"],
            notes=data.get("notes", ""),
            performed_by=request.user,
            visit=visit,
            status=data.get("status"),
        )

        return Response({"success": True, "data": AppointmentDetailSerializer(appointment).data}, status=status.HTTP_201_CREATED)


class AppointmentDetailView(APIView):
    permission_classes = [IsHospitalStaff]

    def get_object(self, appointment_id):
        try:
            return Appointment.objects.select_related("student", "visit", "performed_by").get(id=appointment_id)
        except Appointment.DoesNotExist:
            raise NotFound()

    def get(self, request, appointment_id):
        appointment = self.get_object(appointment_id)
        return Response({"success": True, "data": AppointmentDetailSerializer(appointment).data})

    def put(self, request, appointment_id):
        appointment = self.get_object(appointment_id)
        serializer = AppointmentUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if "status" in serializer.validated_data:
            appointment.status = serializer.validated_data["status"]
        if "notes" in serializer.validated_data:
            appointment.notes = serializer.validated_data["notes"]
        if serializer.validated_data:
            appointment.save()
        return Response({"success": True, "data": AppointmentDetailSerializer(appointment).data})
