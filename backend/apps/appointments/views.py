from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.core.permissions import IsHospitalStaff


class AppointmentListView(APIView):
    permission_classes = [IsHospitalStaff]

    def get(self, request):
        appointments = Appointment.objects.select_related("student").order_by("scheduled_at")[:100]
        return Response(
            {
                "success": True,
                "data": [
                    {
                        "id": str(a.id),
                        "student": a.student.full_name,
                        "matric_number": a.student.matric_number,
                        "title": a.title,
                        "scheduled_at": a.scheduled_at,
                        "status": a.status,
                    }
                    for a in appointments
                ],
            }
        )
