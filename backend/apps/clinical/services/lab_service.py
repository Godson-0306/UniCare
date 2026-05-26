import uuid
from datetime import datetime

from django.db import transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.clinical.constants import LabRequestStatus
from apps.clinical.models import LabRequest, LabResult
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.visits.constants import QueueStage
from apps.visits.services.visit_service import VisitService


class LabService:
    @staticmethod
    def generate_request_number() -> str:
        stamp = datetime.now().strftime("%Y%m%d")
        suffix = uuid.uuid4().hex[:6].upper()
        return f"LAB-{stamp}-{suffix}"

    @classmethod
    @transaction.atomic
    def create_request(cls, *, visit, test_name: str, test_code: str, notes: str, performed_by) -> LabRequest:
        request = LabRequest.objects.create(
            visit=visit,
            request_number=cls.generate_request_number(),
            test_name=test_name,
            test_code=test_code,
            clinical_notes=notes,
            performed_by=performed_by,
        )
        VisitService.enqueue(visit=visit, stage=QueueStage.LAB, performed_by=performed_by)
        AuditService.log(
            action="lab_request_created",
            entity_type="lab_request",
            entity_id=str(request.id),
            performed_by=performed_by,
            visit=visit,
        )
        return request

    @classmethod
    @transaction.atomic
    def upload_result(
        cls,
        *,
        lab_request: LabRequest,
        result_summary: str,
        result_file=None,
        is_abnormal: bool,
        performed_by,
    ) -> LabResult:
        lab_request.status = LabRequestStatus.COMPLETED
        lab_request.completed_at = timezone.now()
        lab_request.performed_by = performed_by
        lab_request.save()

        result, _ = LabResult.objects.update_or_create(
            lab_request=lab_request,
            defaults={
                "visit": lab_request.visit,
                "result_summary": result_summary,
                "is_abnormal": is_abnormal,
                "performed_by": performed_by,
            },
        )
        if result_file:
            result.result_file = result_file
            result.save(update_fields=["result_file", "updated_at"])

        student = lab_request.visit.student
        NotificationService.create_notification(
            student=student,
            notification_type=NotificationType.LAB_RESULT,
            title="Lab result available",
            message=f"Your lab result for {lab_request.test_name} is ready.",
            metadata={"lab_request_id": str(lab_request.id)},
        )
        AuditService.log(
            action="lab_result_uploaded",
            entity_type="lab_result",
            entity_id=str(result.id),
            performed_by=performed_by,
            visit=lab_request.visit,
        )
        return result
