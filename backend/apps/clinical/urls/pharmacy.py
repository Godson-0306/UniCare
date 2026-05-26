from django.urls import path

from apps.clinical.views.pharmacy_views import DispensePrescriptionView, PharmacyQueueView, PrescriptionDetailView

urlpatterns = [
    path("queue/", PharmacyQueueView.as_view()),
    path("prescriptions/<uuid:prescription_id>/", PrescriptionDetailView.as_view()),
    path("prescriptions/<uuid:prescription_id>/dispense/", DispensePrescriptionView.as_view()),
]
