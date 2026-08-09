import csv

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, WorkstationAccount
from apps.admin_console.services.analytics import build_analytics
from apps.admin_console.services.audit_query import filter_audit_logs, paginate_audit_logs, serialize_audit_log
from apps.admin_console.services.clinical_lists import list_appointments, list_emergencies
from apps.admin_console.services.ops import build_ops_queues
from apps.admin_console.services.overview import build_overview
from apps.admin_console.services import users as user_service
from apps.admin_console.services import workstations as workstation_service
from apps.core.permissions import IsAdminUser


def _int_param(request, name: str, default: int) -> int:
    raw = request.query_params.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


class OverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({"success": True, "data": build_overview()})


class AnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        days = _int_param(request, "days", 14)
        return Response({"success": True, "data": build_analytics(days=days)})


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
        data = paginate_audit_logs(
            qs,
            offset=_int_param(request, "offset", 0),
            limit=_int_param(request, "limit", 50),
        )
        return Response({"success": True, "data": data})


class AuditLogExportView(APIView):
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
        )[:5000]

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="audit-logs.csv"'
        writer = csv.writer(response)
        writer.writerow(
            [
                "id",
                "action",
                "entity_type",
                "entity_id",
                "performed_by",
                "workstation_name",
                "role",
                "ip_address",
                "created_at",
            ]
        )
        for log in qs.iterator():
            row = serialize_audit_log(log)
            writer.writerow(
                [
                    row["id"],
                    row["action"],
                    row["entity_type"],
                    row["entity_id"],
                    row["performed_by"] or "",
                    row["workstation_name"] or "",
                    row["role"] or "",
                    row.get("ip_address") or "",
                    row["created_at"].isoformat() if row["created_at"] else "",
                ]
            )
        return response


class UserListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        data = user_service.list_users(
            role=request.query_params.get("role", ""),
            account_type=request.query_params.get("account_type", ""),
            is_active=request.query_params.get("is_active", ""),
            q=request.query_params.get("q", ""),
            offset=_int_param(request, "offset", 0),
            limit=_int_param(request, "limit", 50),
        )
        return Response({"success": True, "data": data})

    def post(self, request):
        user, password = user_service.create_user(actor=request.user, payload=request.data)
        payload = user_service.serialize_user(user)
        payload["temporary_password"] = password
        return Response({"success": True, "data": payload}, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        user = get_object_or_404(
            User.objects.select_related("student_profile", "workstation_profile"),
            id=user_id,
        )
        return Response({"success": True, "data": user_service.serialize_user(user)})

    def patch(self, request, user_id):
        user = get_object_or_404(
            User.objects.select_related("student_profile", "workstation_profile"),
            id=user_id,
        )
        user = user_service.update_user(actor=request.user, user=user, payload=request.data)
        return Response({"success": True, "data": user_service.serialize_user(user)})

    def delete(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        hard = str(request.query_params.get("hard", "")).lower() in ("1", "true", "yes")
        user_service.delete_user(actor=request.user, user=user, hard=hard)
        return Response({"success": True, "message": "User updated."})


class UserResetPasswordView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        password = user_service.reset_password(
            actor=request.user,
            user=user,
            password=request.data.get("password"),
        )
        return Response({"success": True, "data": {"temporary_password": password}})


class WorkstationListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        data = workstation_service.list_workstations(
            role=request.query_params.get("role", ""),
            is_active=request.query_params.get("is_active", ""),
            q=request.query_params.get("q", ""),
            offset=_int_param(request, "offset", 0),
            limit=_int_param(request, "limit", 50),
        )
        return Response({"success": True, "data": data})

    def post(self, request):
        station, password = workstation_service.create_workstation(actor=request.user, payload=request.data)
        payload = workstation_service.serialize_workstation(station)
        payload["temporary_password"] = password
        return Response({"success": True, "data": payload}, status=status.HTTP_201_CREATED)


class WorkstationDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, workstation_id):
        station = get_object_or_404(
            WorkstationAccount.objects.select_related("user", "managed_by"),
            id=workstation_id,
        )
        return Response({"success": True, "data": workstation_service.serialize_workstation(station)})

    def patch(self, request, workstation_id):
        station = get_object_or_404(
            WorkstationAccount.objects.select_related("user", "managed_by"),
            id=workstation_id,
        )
        station = workstation_service.update_workstation(actor=request.user, station=station, payload=request.data)
        return Response({"success": True, "data": workstation_service.serialize_workstation(station)})

    def delete(self, request, workstation_id):
        station = get_object_or_404(WorkstationAccount.objects.select_related("user"), id=workstation_id)
        hard = str(request.query_params.get("hard", "")).lower() in ("1", "true", "yes")
        workstation_service.delete_workstation(actor=request.user, station=station, hard=hard)
        return Response({"success": True, "message": "Workstation updated."})


class WorkstationResetPasswordView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, workstation_id):
        station = get_object_or_404(WorkstationAccount.objects.select_related("user"), id=workstation_id)
        password = workstation_service.reset_workstation_password(
            actor=request.user,
            station=station,
            password=request.data.get("password"),
        )
        return Response({"success": True, "data": {"temporary_password": password}})


class OpsQueuesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({"success": True, "data": build_ops_queues()})


class EmergencyListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        data = list_emergencies(
            status=request.query_params.get("status", ""),
            q=request.query_params.get("q", ""),
            offset=_int_param(request, "offset", 0),
            limit=_int_param(request, "limit", 50),
        )
        return Response({"success": True, "data": data})


class AppointmentListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        data = list_appointments(
            status=request.query_params.get("status", ""),
            q=request.query_params.get("q", ""),
            date_from=request.query_params.get("from", ""),
            date_to=request.query_params.get("to", ""),
            offset=_int_param(request, "offset", 0),
            limit=_int_param(request, "limit", 50),
        )
        return Response({"success": True, "data": data})
