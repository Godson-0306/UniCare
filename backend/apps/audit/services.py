from django.conf import settings

from apps.audit.middleware import get_audit_context
from apps.audit.models import AuditLog


class AuditService:
    @staticmethod
    def log(
        *,
        action: str,
        entity_type: str,
        entity_id: str,
        performed_by=None,
        visit=None,
        emergency_event=None,
        metadata: dict | None = None,
    ) -> AuditLog | None:
        if not settings.AUDIT_LOG_ENABLED:
            return None

        ctx = get_audit_context()
        workstation_name = ""
        role = ""
        if performed_by and hasattr(performed_by, "workstation_profile"):
            workstation_name = performed_by.workstation_profile.station_name
            role = performed_by.role
        elif performed_by:
            role = performed_by.role

        return AuditLog.objects.create(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            performed_by=performed_by,
            visit=visit,
            emergency_event=emergency_event,
            ip_address=ctx.get("ip_address"),
            user_agent=ctx.get("user_agent", ""),
            workstation_name=workstation_name,
            role=role,
            metadata=metadata or {},
        )

    @classmethod
    def log_access(
        cls,
        *,
        performed_by,
        entity_type: str,
        entity_id: str,
        visit=None,
        emergency_event=None,
        metadata: dict | None = None,
    ) -> AuditLog | None:
        return cls.log(
            action=f"{entity_type}_accessed",
            entity_type=entity_type,
            entity_id=entity_id,
            performed_by=performed_by,
            visit=visit,
            emergency_event=emergency_event,
            metadata=metadata,
        )
