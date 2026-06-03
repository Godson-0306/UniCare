from apps.clinical.models import LabResult, Prescription, StudentMedicalRecord, TreatmentSchedule
from apps.emergency.models import EmergencyEvent
from apps.visits.models import Visit


class TimelineService:
    @classmethod
    def build_for_student(cls, student):
        items: list[dict] = []

        for visit in Visit.objects.filter(student=student).select_related("consultation").order_by("-registered_at"):
            consultation = getattr(visit, "consultation", None)
            items.append(
                {
                    "kind": "visit",
                    "timestamp": visit.registered_at,
                    "title": f"Visit {visit.visit_number}",
                    "status": visit.status,
                    "priority": visit.priority,
                    "visit_id": str(visit.id),
                    "details": {
                        "chief_complaint": visit.chief_complaint,
                        "diagnosis": consultation.diagnosis if consultation else "",
                    },
                }
            )

        for record in StudentMedicalRecord.objects.filter(student=student, is_active=True).select_related("visit", "performed_by"):
            items.append(
                {
                    "kind": "medical_record",
                    "timestamp": record.diagnosed_at or record.created_at,
                    "title": record.title,
                    "status": record.record_type,
                    "visit_id": str(record.visit_id) if record.visit_id else None,
                    "details": {
                        "record_type": record.record_type,
                        "details": record.details,
                        "performed_by": record.performed_by.get_full_name() if record.performed_by else "",
                    },
                }
            )

        for prescription in Prescription.objects.filter(visit__student=student).select_related("visit").prefetch_related("items"):
            items.append(
                {
                    "kind": "prescription",
                    "timestamp": prescription.created_at,
                    "title": prescription.prescription_number,
                    "status": prescription.status,
                    "visit_id": str(prescription.visit_id),
                    "details": {"items": [item.drug_name for item in prescription.items.all()]},
                }
            )

        for result in (
            LabResult.objects.filter(visit__student=student)
            .select_related("lab_request", "visit")
            .prefetch_related("lab_request__tests")
        ):
            tests = list(result.lab_request.tests.all())
            items.append(
                {
                    "kind": "lab_result",
                    "timestamp": result.released_at,
                    "title": result.lab_request.request_number,
                    "status": "abnormal" if result.is_abnormal else "normal",
                    "visit_id": str(result.visit_id),
                    "details": {
                        "summary": result.result_summary,
                        "tests": [
                            {
                                "test_name": test.test_name,
                                "result_value": test.result_value,
                                "reference_range": test.reference_range,
                                "comments": test.comments,
                                "completed_at": test.completed_at,
                            }
                            for test in tests
                        ],
                    },
                }
            )

        for event in EmergencyEvent.objects.filter(student=student).select_related("visit", "assigned_workstation"):
            items.append(
                {
                    "kind": "emergency",
                    "timestamp": event.created_at,
                    "title": "Emergency event",
                    "status": event.status,
                    "visit_id": str(event.visit_id) if event.visit_id else None,
                    "details": {
                        "description": event.description,
                        "assigned_workstation": event.assigned_workstation.station_name if event.assigned_workstation else None,
                    },
                }
            )

        for plan in TreatmentSchedule.objects.filter(student=student).select_related("visit"):
            items.append(
                {
                    "kind": "treatment_plan",
                    "timestamp": plan.created_at,
                    "title": plan.title,
                    "status": plan.status,
                    "visit_id": str(plan.visit_id),
                    "details": {
                        "schedule_type": plan.schedule_type,
                        "frequency": plan.frequency,
                        "next_due_at": plan.next_due_at,
                    },
                }
            )

        return sorted(items, key=lambda item: item["timestamp"], reverse=True)
