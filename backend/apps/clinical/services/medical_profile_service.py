from django.db import transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.clinical.models import StudentMedicalRecord


class MedicalProfileService:
    @classmethod
    @transaction.atomic
    def create_record(
        cls,
        *,
        student,
        record_type: str,
        title: str,
        details: str,
        performed_by,
        visit=None,
        diagnosed_at=None,
        is_active: bool = True,
    ) -> StudentMedicalRecord:
        record = StudentMedicalRecord.objects.create(
            student=student,
            visit=visit,
            record_type=record_type,
            title=title,
            details=details,
            diagnosed_at=diagnosed_at or timezone.now(),
            is_active=is_active,
            performed_by=performed_by,
        )
        AuditService.log(
            action="medical_record_created",
            entity_type="medical_record",
            entity_id=str(record.id),
            performed_by=performed_by,
            visit=visit,
            metadata={"student_id": str(student.id), "record_type": record_type},
        )
        return record

    @classmethod
    @transaction.atomic
    def update_record(
        cls,
        *,
        record: StudentMedicalRecord,
        performed_by,
        **updates,
    ) -> StudentMedicalRecord:
        for field, value in updates.items():
            setattr(record, field, value)
        record.performed_by = performed_by
        record.save()
        AuditService.log(
            action="medical_record_updated",
            entity_type="medical_record",
            entity_id=str(record.id),
            performed_by=performed_by,
            visit=record.visit,
            metadata={"student_id": str(record.student_id), "record_type": record.record_type},
        )
        return record
