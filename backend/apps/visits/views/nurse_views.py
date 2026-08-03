from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsNurse, assert_staff_can_access_visit
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
        visit = get_object_or_404(Visit.objects.select_related("student"), id=serializer.validated_data["visit_id"])
        assert_staff_can_access_visit(request.user, visit)
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


class NurseVisitDetailView(APIView):
    permission_classes = [IsNurse]

    def get(self, request, visit_id):
        visit = get_object_or_404(
            Visit.objects.select_related("student", "consultation").prefetch_related("vitals_records"),
            id=visit_id,
        )
        assert_staff_can_access_visit(request.user, visit)
        return Response({"success": True, "data": VisitDetailSerializer(visit).data})


class NurseStudentHistoryView(APIView):
    permission_classes = [IsNurse]

    def get(self, request, student_id):
        visits = Visit.objects.filter(student_id=student_id).select_related("student", "consultation").prefetch_related("vitals_records").order_by("-registered_at")[:50]
        return Response({"success": True, "data": VisitDetailSerializer(visits, many=True).data})


class ForwardToDoctorView(APIView):
    permission_classes = [IsNurse]

    def post(self, request, visit_id):
        visit = get_object_or_404(Visit, id=visit_id)
        assert_staff_can_access_visit(request.user, visit)
        VisitService.forward_to_doctor(visit, request.user)
        return Response({"success": True, "message": "Patient forwarded to doctor queue."})


class StartQueueEntryView(APIView):
    permission_classes = [IsNurse]

    def post(self, request, entry_id):
        entry = get_object_or_404(QueueEntry.objects.select_related("visit"), id=entry_id, stage=QueueStage.NURSE)
        assert_staff_can_access_visit(request.user, entry.visit)
        VisitService.start_queue_entry(entry, request.user)
        return Response({"success": True, "data": QueueEntrySerializer(entry).data})


class AdjustVisitPriorityView(APIView):
    permission_classes = [IsNurse]

    def post(self, request, visit_id):
        visit = get_object_or_404(Visit, id=visit_id)
        assert_staff_can_access_visit(request.user, visit)
        priority = request.data.get("priority", "normal")
        reason = request.data.get("reason", "")
        VisitService.adjust_priority(visit, priority, request.user, reason=reason)
        return Response({"success": True, "data": VisitDetailSerializer(visit).data})
