from django.db.models import Prefetch
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsNurse
from apps.visits.constants import QueueStage, QueueStatus, VisitStatus
from apps.visits.models import QueueEntry, Visit, Vitals
from apps.visits.serializers import NurseQueueVisitSerializer, QueueEntrySerializer, RecordVitalsSerializer, VisitDetailSerializer
from apps.visits.services.visit_service import VisitService


class NurseQueueView(APIView):
    permission_classes = [IsNurse]

    def get(self, request):
        visits = (
            Visit.objects.filter(status__in=[VisitStatus.CREATED, VisitStatus.IN_NURSE_QUEUE])
            .select_related("student")
            .prefetch_related(
                Prefetch(
                    "queue_entries",
                    queryset=QueueEntry.objects.filter(
                        stage=QueueStage.NURSE,
                        status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
                    ).order_by("created_at"),
                    to_attr="active_nurse_entries",
                )
            )
            .order_by("registered_at", "created_at")
        )
        return Response({"success": True, "data": NurseQueueVisitSerializer(visits, many=True).data})


class RecordVitalsView(APIView):
    permission_classes = [IsNurse]

    def post(self, request):
        serializer = RecordVitalsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = Visit.objects.select_related("student").get(id=serializer.validated_data["visit_id"])
        vitals = Vitals.objects.create(
            visit=visit,
            performed_by=request.user,
            temperature_c=serializer.validated_data.get("temperature_c"),
            blood_pressure_systolic=serializer.validated_data.get("blood_pressure_systolic"),
            blood_pressure_diastolic=serializer.validated_data.get("blood_pressure_diastolic"),
            pulse_rate=serializer.validated_data.get("pulse_rate"),
            respiratory_rate=serializer.validated_data.get("respiratory_rate"),
            weight_kg=serializer.validated_data.get("weight_kg"),
            height_cm=serializer.validated_data.get("height_cm"),
            spo2=serializer.validated_data.get("spo2"),
            intake_notes=serializer.validated_data.get("intake_notes", ""),
        )
        nurse_entry = (
            QueueEntry.objects.filter(visit=visit, stage=QueueStage.NURSE, status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS])
            .order_by("created_at")
            .first()
        )
        if nurse_entry:
            VisitService.complete_queue_entry(nurse_entry, request.user, notes="Vitals recorded")
        VisitService.transition_status(visit, "vitals_recorded", performed_by=request.user)
        VisitService.forward_to_doctor(visit, request.user)
        return Response(
            {"success": True, "data": {"visit": VisitDetailSerializer(visit).data, "vitals_id": str(vitals.id)}},
            status=status.HTTP_201_CREATED,
        )


class ForwardToDoctorView(APIView):
    permission_classes = [IsNurse]

    def post(self, request, visit_id):
        visit = Visit.objects.get(id=visit_id)
        VisitService.forward_to_doctor(visit, request.user)
        return Response({"success": True, "message": "Patient forwarded to doctor queue."})


class StartQueueEntryView(APIView):
    permission_classes = [IsNurse]

    def post(self, request, entry_id):
        entry = QueueEntry.objects.get(id=entry_id, stage=QueueStage.NURSE)
        VisitService.start_queue_entry(entry, request.user)
        return Response({"success": True, "data": QueueEntrySerializer(entry).data})


class AdjustVisitPriorityView(APIView):
    permission_classes = [IsNurse]

    def post(self, request, visit_id):
        visit = Visit.objects.get(id=visit_id)
        priority = request.data.get("priority", "normal")
        reason = request.data.get("reason", "")
        VisitService.adjust_priority(visit, priority, request.user, reason=reason)
        return Response({"success": True, "data": VisitDetailSerializer(visit).data})
