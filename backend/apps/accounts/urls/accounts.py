from django.urls import path

from apps.accounts.views.profile_views import CurrentUserView

urlpatterns = [
    path("me/", CurrentUserView.as_view(), name="current-user"),
]
