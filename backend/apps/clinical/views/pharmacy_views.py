from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.constants import PrescriptionStatus
from apps.clinical.models import Prescription, PrescriptionItem
from apps.clinical.serializers import PrescriptionDetailSerializer
from apps.clinical.services.prescription_service import PrescriptionService
from apps.core.permissions import IsPharmacist


class PharmacyQueueView(APIView):
    permission_classes = [IsPharmacist]

    def get(self, request):
        status_filter = request.query_params.get("status", "").strip()
        prescriptions = (
            Prescription.objects.filter(status__in=[PrescriptionStatus.PENDING, PrescriptionStatus.PARTIALLY_DISPENSED, PrescriptionStatus.DISPENSED])
            .select_related("visit", "visit__student", "visit__consultation", "performed_by")
            .prefetch_related("items")
            .order_by("created_at")
        )
        if status_filter:
            prescriptions = prescriptions.filter(status=status_filter)
        return Response({"success": True, "data": PrescriptionDetailSerializer(prescriptions, many=True).data})


class PrescriptionDetailView(APIView):
    permission_classes = [IsPharmacist]

    def get(self, request, prescription_id):
        prescription = Prescription.objects.select_related("visit__student", "visit__consultation", "performed_by").prefetch_related("items").get(id=prescription_id)
        return Response({"success": True, "data": PrescriptionDetailSerializer(prescription).data})


class StudentPrescriptionHistoryView(APIView):
    permission_classes = [IsPharmacist]

    def get(self, request, student_id):
        prescriptions = (
            Prescription.objects.filter(visit__student_id=student_id)
            .select_related("visit", "visit__student", "visit__consultation", "performed_by")
            .prefetch_related("items")
            .order_by("-created_at")[:100]
        )
        return Response({"success": True, "data": PrescriptionDetailSerializer(prescriptions, many=True).data})


class DispensePrescriptionView(APIView):
    permission_classes = [IsPharmacist]

    def post(self, request, prescription_id):
        prescription = Prescription.objects.get(id=prescription_id)
        PrescriptionService.mark_dispensed(prescription, request.user)
        return Response({"success": True, "message": "Prescription marked as dispensed."})


class DispensePrescriptionItemView(APIView):
    permission_classes = [IsPharmacist]

    def post(self, request, prescription_id, item_id):
        item = PrescriptionItem.objects.select_related("prescription", "prescription__visit", "prescription__visit__student").get(
            id=item_id,
            prescription_id=prescription_id,
        )
        prescription = PrescriptionService.mark_item_dispensed(item, request.user)
        return Response({"success": True, "data": PrescriptionDetailSerializer(prescription).data})
