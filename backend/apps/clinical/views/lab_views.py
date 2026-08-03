from datetime import date

from django.shortcuts import get_object_or_404
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.constants import LabRequestStatus
from apps.clinical.models import LabRequest, LabRequestTest
from apps.clinical.serializers import (
    LabRequestSerializer,
    LabRequestTestSerializer,
    SaveLabTestResultSerializer,
    UploadLabResultSerializer,
)
from apps.clinical.services.lab_service import LabService
from apps.core.permissions import IsLabTechnician, assert_staff_can_access_student, assert_staff_can_access_visit


class LabQueueView(APIView):
    permission_classes = [IsLabTechnician]

    def get(self, request):
        base_queryset = LabRequest.objects.select_related("visit", "visit__student", "performed_by").prefetch_related(
            Prefetch("tests", queryset=LabRequestTest.objects.select_related("performed_by").order_by("created_at"))
        )
        filtered = self._apply_filters(base_queryset, request)
        requests = filtered.order_by("requested_at", "created_at")[:200]
        return Response(
            {
                "success": True,
                "data": {
                    "stats": self._build_stats(),
                    "requests": LabRequestSerializer(requests, many=True).data,
                },
            }
        )

    def _apply_filters(self, queryset, request):
        query = request.query_params.get("q", "").strip()
        status_filter = request.query_params.get("status", "").strip()
        date_filter = request.query_params.get("date", "").strip()

        if query:
            queryset = queryset.filter(
                Q(request_number__icontains=query)
                | Q(visit__student__first_name__icontains=query)
                | Q(visit__student__last_name__icontains=query)
                | Q(visit__student__other_names__icontains=query)
                | Q(visit__student__matric_number__icontains=query)
            )
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_filter:
            try:
                requested_date = date.fromisoformat(date_filter)
            except ValueError:
                requested_date = None
            if requested_date:
                queryset = queryset.filter(requested_at__date=requested_date)
        return queryset

    def _build_stats(self):
        today = timezone.localdate()
        aggregate = LabRequest.objects.aggregate(
            active=Count("id", filter=Q(status__in=[LabRequestStatus.PENDING, LabRequestStatus.IN_PROGRESS])),
            pending=Count("id", filter=Q(status=LabRequestStatus.PENDING)),
            completed=Count("id", filter=Q(status=LabRequestStatus.COMPLETED)),
            today=Count("tests", filter=Q(requested_at__date=today)),
        )
        return {
            "active": aggregate["active"],
            "pending": aggregate["pending"],
            "completed": aggregate["completed"],
            "today": aggregate["today"],
        }


class LabRequestDetailView(APIView):
    permission_classes = [IsLabTechnician]

    def get(self, request, request_id):
        lab_request = get_object_or_404(
            LabRequest.objects.select_related("visit", "visit__student", "performed_by", "result")
            .prefetch_related(Prefetch("tests", queryset=LabRequestTest.objects.select_related("performed_by").order_by("created_at")))
            ,
            id=request_id,
        )
        assert_staff_can_access_visit(request.user, lab_request.visit)
        return Response({"success": True, "data": LabRequestSerializer(lab_request).data})


class StudentLabHistoryView(APIView):
    permission_classes = [IsLabTechnician]

    def get(self, request, student_id):
        requests = (
            LabRequest.objects.filter(visit__student_id=student_id)
            .select_related("visit", "visit__student", "performed_by", "result")
            .prefetch_related(Prefetch("tests", queryset=LabRequestTest.objects.select_related("performed_by").order_by("created_at")))
            .order_by("-requested_at")[:100]
        )
        first_request = requests.first()
        if first_request:
            assert_staff_can_access_student(request.user, first_request.visit.student)
        return Response({"success": True, "data": LabRequestSerializer(requests, many=True).data})


class UploadLabResultView(APIView):
    permission_classes = [IsLabTechnician]

    def post(self, request, request_id):
        serializer = UploadLabResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lab_request = get_object_or_404(LabRequest.objects.prefetch_related("tests").select_related("visit"), id=request_id)
        assert_staff_can_access_visit(request.user, lab_request.visit)
        result = LabService.upload_result(
            lab_request=lab_request,
            result_summary=serializer.validated_data["result_summary"],
            result_file=request.FILES.get("result_file"),
            is_abnormal=serializer.validated_data.get("is_abnormal", False),
            performed_by=request.user,
            tests=serializer.validated_data.get("tests"),
        )
        if result is None:
            return Response(
                {"success": False, "error": {"message": "Complete every requested test before submitting the lab request."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "success": True,
                "data": {
                    "result_id": str(result.id),
                    "file_url": result.result_file.url if result.result_file else None,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class SaveLabTestResultView(APIView):
    permission_classes = [IsLabTechnician]

    def post(self, request, request_id, test_id):
        serializer = SaveLabTestResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lab_test = get_object_or_404(
            LabRequestTest.objects.select_related("lab_request", "lab_request__visit"),
            id=test_id,
            lab_request_id=request_id,
        )
        assert_staff_can_access_visit(request.user, lab_test.lab_request.visit)
        updated = LabService.save_test_result(
            lab_test=lab_test,
            result_value=serializer.validated_data.get("result_value", ""),
            reference_range=serializer.validated_data.get("reference_range", ""),
            interpretation=serializer.validated_data.get("interpretation", ""),
            technician_notes=serializer.validated_data.get("technician_notes", ""),
            comments=serializer.validated_data.get("comments", ""),
            attachment=request.FILES.get("attachment"),
            status=serializer.validated_data.get("status", "completed"),
            performed_by=request.user,
        )
        return Response({"success": True, "data": LabRequestTestSerializer(updated).data})
