from django.urls import path

from apps.visits.views.doctor_views import (
    CreateFollowUpAppointmentView,
    CreateLabRequestView,
    StudentMedicalProfileView,
    StudentFollowUpsView,
    StudentMedicalRecordCreateView,
    StudentMedicalRecordUpdateView,
    CreatePrescriptionView,
    CreateTreatmentScheduleView,
    DoctorQueueView,
    SaveConsultationView,
    StudentTimelineView,
    StudentMedicalHistoryView,
    VisitDetailView,
)

urlpatterns = [
    path("queue/", DoctorQueueView.as_view()),
    path("visits/<uuid:visit_id>/", VisitDetailView.as_view()),
    path("students/<uuid:student_id>/history/", StudentMedicalHistoryView.as_view()),
    path("students/<uuid:student_id>/timeline/", StudentTimelineView.as_view()),
    path("students/<uuid:student_id>/medical-profile/", StudentMedicalProfileView.as_view()),
    path("students/<uuid:student_id>/follow-ups/", StudentFollowUpsView.as_view()),
    path("students/<uuid:student_id>/medical-profile/records/", StudentMedicalRecordCreateView.as_view()),
    path("medical-profile/records/<uuid:record_id>/", StudentMedicalRecordUpdateView.as_view()),
    path("consultations/", SaveConsultationView.as_view()),
    path("prescriptions/", CreatePrescriptionView.as_view()),
    path("lab-requests/", CreateLabRequestView.as_view()),
    path("treatment-schedules/", CreateTreatmentScheduleView.as_view()),
    path("follow-up-appointments/", CreateFollowUpAppointmentView.as_view()),
]
