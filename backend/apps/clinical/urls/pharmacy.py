from django.urls import path

from apps.clinical.views.pharmacy_views import (
    DispensePrescriptionItemView,
    DispensePrescriptionView,
    PharmacyQueueView,
    PrescriptionDetailView,
    StudentPrescriptionHistoryView,
)

urlpatterns = [
    path("queue/", PharmacyQueueView.as_view()),
    path("students/<uuid:student_id>/history/", StudentPrescriptionHistoryView.as_view()),
    path("prescriptions/<uuid:prescription_id>/", PrescriptionDetailView.as_view()),
    path("prescriptions/<uuid:prescription_id>/items/<uuid:item_id>/dispense/", DispensePrescriptionItemView.as_view()),
    path("prescriptions/<uuid:prescription_id>/dispense/", DispensePrescriptionView.as_view()),
]
