from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.constants import PrescriptionStatus
from apps.clinical.models import Prescription
from apps.clinical.serializers import PrescriptionDetailSerializer
from apps.clinical.services.prescription_service import PrescriptionService
from apps.core.permissions import IsPharmacist


class PharmacyQueueView(APIView):
    permission_classes = [IsPharmacist]

    def get(self, request):
        prescriptions = (
            Prescription.objects.filter(status=PrescriptionStatus.PENDING)
            .select_related("visit", "visit__student")
            .prefetch_related("items")
            .order_by("created_at")
        )
        return Response({"success": True, "data": PrescriptionDetailSerializer(prescriptions, many=True).data})


class PrescriptionDetailView(APIView):
    permission_classes = [IsPharmacist]

    def get(self, request, prescription_id):
        prescription = Prescription.objects.select_related("visit__student").prefetch_related("items").get(id=prescription_id)
        return Response({"success": True, "data": PrescriptionDetailSerializer(prescription).data})


class DispensePrescriptionView(APIView):
    permission_classes = [IsPharmacist]

    def post(self, request, prescription_id):
        prescription = Prescription.objects.get(id=prescription_id)
        PrescriptionService.mark_dispensed(prescription, request.user)
        return Response({"success": True, "message": "Prescription marked as dispensed."})
