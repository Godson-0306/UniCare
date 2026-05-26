from django.urls import path

from apps.accounts.views.student_portal_views import (
    StudentAppointmentsView,
    StudentEmergencyView,
    StudentLabResultsView,
    StudentMedicalHistoryView,
    StudentMedicalProfileView,
    StudentNotificationsView,
    StudentPrescriptionsView,
)

urlpatterns = [
    path("prescriptions/", StudentPrescriptionsView.as_view()),
    path("lab-results/", StudentLabResultsView.as_view()),
    path("appointments/", StudentAppointmentsView.as_view()),
    path("notifications/", StudentNotificationsView.as_view()),
    path("medical-history/", StudentMedicalHistoryView.as_view()),
    path("medical-profile/", StudentMedicalProfileView.as_view()),
    path("emergency/", StudentEmergencyView.as_view()),
]
