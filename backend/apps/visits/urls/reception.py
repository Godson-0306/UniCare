from django.urls import path

from apps.visits.views.reception_views import CreateAppointmentView, CreateVisitView, StudentSearchView

urlpatterns = [
    path("students/search/", StudentSearchView.as_view()),
    path("visits/", CreateVisitView.as_view()),
    path("appointments/", CreateAppointmentView.as_view()),
]
