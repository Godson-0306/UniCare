from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.constants import LabRequestStatus
from apps.clinical.models import LabRequest
from apps.clinical.serializers import LabRequestSerializer, UploadLabResultSerializer
from apps.clinical.services.lab_service import LabService
from apps.core.permissions import IsLabTechnician


class LabQueueView(APIView):
    permission_classes = [IsLabTechnician]

    def get(self, request):
        requests = (
            LabRequest.objects.filter(status__in=[LabRequestStatus.PENDING, LabRequestStatus.IN_PROGRESS])
            .select_related("visit", "visit__student")
            .order_by("requested_at")
        )
        return Response({"success": True, "data": LabRequestSerializer(requests, many=True).data})


class UploadLabResultView(APIView):
    permission_classes = [IsLabTechnician]

    def post(self, request, request_id):
        serializer = UploadLabResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lab_request = LabRequest.objects.select_related("visit").get(id=request_id)
        result = LabService.upload_result(
            lab_request=lab_request,
            result_summary=serializer.validated_data["result_summary"],
            result_file=request.FILES.get("result_file"),
            is_abnormal=serializer.validated_data.get("is_abnormal", False),
            performed_by=request.user,
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
