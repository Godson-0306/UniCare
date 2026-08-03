from django.urls import path

from apps.accounts.views.auth_views import (
    AdminLoginView,
    CustomTokenRefreshView,
    LogoutView,
    StudentLoginView,
    StudentRegistrationView,
    UnifiedLoginView,
    WorkstationLoginView,
)

urlpatterns = [
    path("login/", UnifiedLoginView.as_view(), name="unified-login"),
    path("student/login/", StudentLoginView.as_view(), name="student-login"),
    path("student/register/", StudentRegistrationView.as_view(), name="student-register"),
    path("workstation/login/", WorkstationLoginView.as_view(), name="workstation-login"),
    path("admin/login/", AdminLoginView.as_view(), name="admin-login"),
    path("token/refresh/", CustomTokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
