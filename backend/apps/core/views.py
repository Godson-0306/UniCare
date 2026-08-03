from django.db import connections
from django.db.utils import OperationalError
from django.core.cache import cache
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        checks = {"database": "ok", "cache": "ok"}
        status_code = 200

        try:
            connections["default"].cursor().execute("SELECT 1")
        except OperationalError:
            checks["database"] = "unavailable"
            status_code = 503

        try:
            cache.set("healthcheck", "ok", timeout=5)
            if cache.get("healthcheck") != "ok":
                raise RuntimeError("cache read failed")
        except Exception:
            checks["cache"] = "unavailable"
            status_code = 503

        return Response({"success": status_code == 200, "data": checks}, status=status_code)
