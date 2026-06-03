from django.urls import path

from apps.clinical.views.lab_views import LabQueueView, LabRequestDetailView, SaveLabTestResultView, StudentLabHistoryView, UploadLabResultView

urlpatterns = [
    path("queue/", LabQueueView.as_view()),
    path("requests/<uuid:request_id>/", LabRequestDetailView.as_view()),
    path("students/<uuid:student_id>/history/", StudentLabHistoryView.as_view()),
    path("requests/<uuid:request_id>/tests/<uuid:test_id>/results/", SaveLabTestResultView.as_view()),
    path("requests/<uuid:request_id>/results/", UploadLabResultView.as_view()),
]
