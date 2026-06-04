from django.urls import path

from apps.visits.views.nurse_views import (
    AdjustVisitPriorityView,
    ForwardToDoctorView,
    NurseQueueView,
    NurseStudentHistoryView,
    NurseVisitDetailView,
    RecordVitalsView,
    StartQueueEntryView,
)

urlpatterns = [
    path("queue/", NurseQueueView.as_view()),
    path("visits/<uuid:visit_id>/", NurseVisitDetailView.as_view()),
    path("students/<uuid:student_id>/history/", NurseStudentHistoryView.as_view()),
    path("vitals/", RecordVitalsView.as_view()),
    path("visits/<uuid:visit_id>/forward-doctor/", ForwardToDoctorView.as_view()),
    path("visits/<uuid:visit_id>/priority/", AdjustVisitPriorityView.as_view()),
    path("queue/<uuid:entry_id>/start/", StartQueueEntryView.as_view()),
]
