from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.serializers import AppointmentDetailSerializer, AppointmentListQuerySerializer
from apps.appointments.models import Appointment
from apps.core.permissions import IsHospitalStaff
from apps.appointments.services import AppointmentService


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
