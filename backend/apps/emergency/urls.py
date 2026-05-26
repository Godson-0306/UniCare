from django.urls import path

from apps.emergency.views import EmergencyListView, ResolveEmergencyView

urlpatterns = [
    path("events/", EmergencyListView.as_view()),
    path("events/<uuid:event_id>/resolve/", ResolveEmergencyView.as_view()),
]
