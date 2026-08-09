from django.urls import path

from apps.admin_console.views import (
    AnalyticsView,
    AppointmentListView,
    AuditLogExportView,
    AuditLogListView,
    EmergencyListView,
    OpsQueuesView,
    OverviewView,
    UserDetailView,
    UserListCreateView,
    UserResetPasswordView,
    WorkstationDetailView,
    WorkstationListCreateView,
    WorkstationResetPasswordView,
)

urlpatterns = [
    path("overview/", OverviewView.as_view()),
    path("analytics/", AnalyticsView.as_view()),
    path("audit-logs/", AuditLogListView.as_view()),
    path("audit-logs/export/", AuditLogExportView.as_view()),
    path("users/", UserListCreateView.as_view()),
    path("users/<uuid:user_id>/", UserDetailView.as_view()),
    path("users/<uuid:user_id>/reset-password/", UserResetPasswordView.as_view()),
    path("workstations/", WorkstationListCreateView.as_view()),
    path("workstations/<uuid:workstation_id>/", WorkstationDetailView.as_view()),
    path("workstations/<uuid:workstation_id>/reset-password/", WorkstationResetPasswordView.as_view()),
    path("ops/queues/", OpsQueuesView.as_view()),
    path("emergencies/", EmergencyListView.as_view()),
    path("appointments/", AppointmentListView.as_view()),
]
