from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsDutyOfficer, IsHospitalStaff
from apps.emergency.models import EmergencyEvent
from apps.emergency.services import EmergencyService


class EmergencyListView(APIView):
    permission_classes = [IsHospitalStaff]

    def get(self, request):
        events = EmergencyEvent.objects.select_related("student", "visit").order_by("-created_at")[:50]
        return Response(
            {
                "success": True,
                "data": [
                    {
                        "id": str(e.id),
                        "status": e.status,
                        "student": e.student.full_name,
                        "matric_number": e.student.matric_number,
                        "description": e.description,
                        "dial_triggered": e.dial_triggered,
                        "created_at": e.created_at,
                    }
                    for e in events
                ],
            }
        )


class ResolveEmergencyView(APIView):
    permission_classes = [IsDutyOfficer]

    def post(self, request, event_id):
        event = EmergencyEvent.objects.get(id=event_id)
        EmergencyService.resolve(event, request.user)
        return Response({"success": True, "message": "Emergency resolved."})
