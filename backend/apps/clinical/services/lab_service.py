import uuid
from datetime import datetime

from django.db import transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.clinical.constants import LabRequestStatus, LabTestStatus
from apps.clinical.models import LabRequest, LabRequestTest, LabResult
from apps.core.realtime import RealtimeEventService
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.visits.constants import QueueStage, QueueStatus
from apps.visits.services.visit_service import VisitService


class LabService:
    @staticmethod
    def generate_request_number() -> str:
        stamp = datetime.now().strftime("%Y%m%d")
        suffix = uuid.uuid4().hex[:6].upper()
        return f"LAB-{stamp}-{suffix}"

    @classmethod
    @transaction.atomic
    def create_request(
        cls,
        *,
        visit,
        test_name: str = "",
        test_code: str = "",
        notes: str = "",
        performed_by,
        tests: list[dict] | None = None,
    ) -> LabRequest:
        normalized_tests = cls._normalize_tests(tests=tests, fallback_test_name=test_name, fallback_test_code=test_code)
        primary_test = normalized_tests[0]
        request = LabRequest.objects.create(
            visit=visit,
            request_number=cls.generate_request_number(),
            test_name=primary_test["test_name"],
            test_code=primary_test.get("test_code", ""),
            clinical_notes=notes,
            performed_by=performed_by,
        )
        LabRequestTest.objects.bulk_create(
            [
                LabRequestTest(
                    lab_request=request,
                    test_name=item["test_name"],
                    test_code=item.get("test_code", ""),
                    performed_by=performed_by,
                )
                for item in normalized_tests
            ]
        )
        VisitService.enqueue(visit=visit, stage=QueueStage.LAB, performed_by=performed_by)
        AuditService.log(
            action="lab_request_created",
            entity_type="lab_request",
            entity_id=str(request.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"test_count": len(normalized_tests), "tests": [item["test_name"] for item in normalized_tests]},
        )
        VisitService.recalculate_visit_status(visit, performed_by=performed_by)
        RealtimeEventService.publish_to_staff(
            "lab.request_created",
            {
                "lab_request_id": str(request.id),
                "request_number": request.request_number,
                "visit_id": str(visit.id),
                "student": visit.student.full_name,
                "test_count": len(normalized_tests),
            },
        )
        return request

    @classmethod
    @transaction.atomic
    def save_test_result(
        cls,
        *,
        lab_test: LabRequestTest,
        result_value: str,
        reference_range: str = "",
        comments: str = "",
        status: str = LabTestStatus.COMPLETED,
        performed_by,
        finalize: bool = True,
    ) -> LabRequestTest:
        lab_test.result_value = result_value
        lab_test.reference_range = reference_range
        lab_test.comments = comments
        lab_test.status = status
        lab_test.completed_at = timezone.now() if status == LabTestStatus.COMPLETED else None
        lab_test.performed_by = performed_by
        lab_test.save()

        lab_request = lab_test.lab_request
        if lab_request.status == LabRequestStatus.PENDING:
            lab_request.status = LabRequestStatus.IN_PROGRESS
            lab_request.performed_by = performed_by
            lab_request.save(update_fields=["status", "performed_by", "updated_at"])

        AuditService.log(
            action="lab_test_result_saved",
            entity_type="lab_request_test",
            entity_id=str(lab_test.id),
            performed_by=performed_by,
            visit=lab_request.visit,
            metadata={"lab_request_id": str(lab_request.id), "test_name": lab_test.test_name, "status": lab_test.status},
        )
        if finalize:
            cls.finalize_request_if_complete(lab_request, performed_by=performed_by)
        return lab_test

    @classmethod
    @transaction.atomic
    def upload_result(
        cls,
        *,
        lab_request: LabRequest,
        result_summary: str = "",
        result_file=None,
        is_abnormal: bool,
        performed_by,
        tests: list[dict] | None = None,
    ) -> LabResult:
        if tests is None:
            first_test = lab_request.tests.order_by("created_at").first()
            if first_test and result_summary:
                cls.save_test_result(
                    lab_test=first_test,
                    result_value=result_summary,
                    status=LabTestStatus.COMPLETED,
                    performed_by=performed_by,
                    finalize=False,
                )
        else:
            tests_by_id = {str(test.id): test for test in lab_request.tests.all()}
            for item in tests:
                lab_test = tests_by_id.get(str(item.get("test_id", "")))
                if not lab_test:
                    continue
                cls.save_test_result(
                    lab_test=lab_test,
                    result_value=item.get("result_value", ""),
                    reference_range=item.get("reference_range", ""),
                    comments=item.get("comments", ""),
                    status=item.get("status", LabTestStatus.COMPLETED),
                    performed_by=performed_by,
                    finalize=False,
                )
        return cls.finalize_request_if_complete(
            lab_request,
            result_file=result_file,
            is_abnormal=is_abnormal,
            performed_by=performed_by,
            force=True,
        )

    @classmethod
    @transaction.atomic
    def finalize_request_if_complete(
        cls,
        lab_request: LabRequest,
        *,
        result_file=None,
        is_abnormal: bool = False,
        performed_by,
        force: bool = False,
    ) -> LabResult | None:
        lab_request = LabRequest.objects.select_related("visit", "visit__student").prefetch_related("tests").get(id=lab_request.id)
        tests = list(lab_request.tests.all())
        if not tests:
            return None
        if not force and any(test.status != LabTestStatus.COMPLETED for test in tests):
            return None
        if force and any(test.status != LabTestStatus.COMPLETED for test in tests):
            return None

        lab_request.status = LabRequestStatus.COMPLETED
        lab_request.completed_at = timezone.now()
        lab_request.performed_by = performed_by
        lab_request.save()

        result, _ = LabResult.objects.update_or_create(
            lab_request=lab_request,
            defaults={
                "visit": lab_request.visit,
                "result_summary": cls._build_result_summary(tests),
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
            message=f"Your lab result for {lab_request.request_number} is ready.",
            metadata={"lab_request_id": str(lab_request.id)},
        )
        AuditService.log(
            action="lab_result_uploaded",
            entity_type="lab_result",
            entity_id=str(result.id),
            performed_by=performed_by,
            visit=lab_request.visit,
            metadata={"test_count": len(tests)},
        )
        for entry in lab_request.visit.queue_entries.filter(
            stage=QueueStage.LAB,
            status__in=[QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
        ):
            VisitService.complete_queue_entry(entry, performed_by, notes=f"Completed {lab_request.request_number}")
        VisitService.finalize_if_ready(lab_request.visit, performed_by=performed_by)

        RealtimeEventService.publish_to_staff(
            "lab.result_uploaded",
            {
                "lab_request_id": str(lab_request.id),
                "request_number": lab_request.request_number,
                "result_id": str(result.id),
                "visit_id": str(lab_request.visit_id),
                "student": student.full_name,
                "is_abnormal": result.is_abnormal,
                "tests": [
                    {
                        "id": str(test.id),
                        "test_name": test.test_name,
                        "result_value": test.result_value,
                        "reference_range": test.reference_range,
                        "comments": test.comments,
                    }
                    for test in tests
                ],
            },
        )
        return result

    @staticmethod
    def _normalize_tests(*, tests: list[dict] | None, fallback_test_name: str, fallback_test_code: str) -> list[dict]:
        source = tests if tests else [{"test_name": fallback_test_name, "test_code": fallback_test_code}]
        normalized: list[dict] = []
        seen: set[str] = set()
        for item in source:
            test_name = str(item.get("test_name", "")).strip()
            if not test_name:
                continue
            dedupe_key = test_name.casefold()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            normalized.append({"test_name": test_name, "test_code": str(item.get("test_code", "")).strip()})
        if not normalized:
            raise ValueError("At least one lab test is required.")
        return normalized

    @staticmethod
    def _build_result_summary(tests: list[LabRequestTest]) -> str:
        sections = []
        for test in tests:
            sections.append(
                "\n".join(
                    [
                        test.test_name,
                        f"Result: {test.result_value or 'Not provided'}",
                        f"Reference: {test.reference_range or 'N/A'}",
                        f"Comments: {test.comments or 'N/A'}",
                    ]
                )
            )
        return "\n\n---\n\n".join(sections)
