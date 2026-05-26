from django.urls import path

from apps.clinical.views.lab_views import LabQueueView, UploadLabResultView

urlpatterns = [
    path("queue/", LabQueueView.as_view()),
    path("requests/<uuid:request_id>/results/", UploadLabResultView.as_view()),
]
