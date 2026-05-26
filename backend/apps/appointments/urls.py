from django.urls import path

from apps.appointments.views import AppointmentListView

urlpatterns = [
    path("", AppointmentListView.as_view()),
]
