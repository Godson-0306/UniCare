from django.urls import path

from apps.audit.views import AnalyticsDashboardView, AuditLogListView

urlpatterns = [
    path("logs/", AuditLogListView.as_view()),
    path("analytics/", AnalyticsDashboardView.as_view()),
]
