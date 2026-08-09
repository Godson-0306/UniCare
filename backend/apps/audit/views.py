from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_console.services.analytics import build_analytics
from apps.admin_console.services.audit_query import filter_audit_logs, paginate_audit_logs
from apps.core.permissions import IsAdminUser


class AuditLogListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = filter_audit_logs(
            action=request.query_params.get("action", ""),
            entity_type=request.query_params.get("entity_type", ""),
            role=request.query_params.get("role", ""),
            performed_by=request.query_params.get("performed_by", ""),
            q=request.query_params.get("q", ""),
            date_from=request.query_params.get("from", ""),
            date_to=request.query_params.get("to", ""),
        )
        # Backward-compatible flat list (first page, max 200).
        data = paginate_audit_logs(qs, offset=0, limit=200)
        return Response({"success": True, "data": data["items"]})


class AnalyticsDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 14))
        except (TypeError, ValueError):
            days = 14
        return Response({"success": True, "data": build_analytics(days=days)})
