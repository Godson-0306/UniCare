from django.urls import path

from apps.appointments.views import (
    AppointmentListView,
    AppointmentCreateView,
    AppointmentDetailView,
)

urlpatterns = [
    path("", AppointmentListView.as_view()),
    path("create/", AppointmentCreateView.as_view()),
    path("<uuid:appointment_id>/", AppointmentDetailView.as_view()),
]
