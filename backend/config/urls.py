from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.core.views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthCheckView.as_view(), name="health"),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/", include("apps.accounts.urls.auth")),
    path("api/v1/accounts/", include("apps.accounts.urls.accounts")),
    path("api/v1/reception/chat/", include("apps.chat.urls.reception")),
    path("api/v1/reception/", include("apps.visits.urls.reception")),
    path("api/v1/nurse/", include("apps.visits.urls.nurse")),
    path("api/v1/doctor/", include("apps.visits.urls.doctor")),
    path("api/v1/pharmacy/", include("apps.clinical.urls.pharmacy")),
    path("api/v1/lab/", include("apps.clinical.urls.lab")),
    path("api/v1/student/chat/", include("apps.chat.urls.student")),
    path("api/v1/student/", include("apps.accounts.urls.student_portal")),
    path("api/v1/emergency/", include("apps.emergency.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/appointments/", include("apps.appointments.urls")),
    path("api/v1/audit/", include("apps.audit.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
