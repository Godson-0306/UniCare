from apps.appointments.models import Appointment
from apps.clinical.models import FollowUp, LabRequest, LabResult, Prescription, StudentMedicalRecord, TreatmentSchedule
from apps.emergency.models import EmergencyEvent
from apps.visits.models import Consultation, Visit, Vitals


def _staff_name(user) -> str:
    if not user:
        return ""
    return user.get_full_name() or user.username


class TimelineService:
    @classmethod
    def build_for_student(cls, student):
        items: list[dict] = []

        for visit in Visit.objects.filter(student=student).select_related("consultation", "performed_by"):
            consultation = getattr(visit, "consultation", None)
            items.append(
                {
                    "kind": "visit",
                    "timestamp": visit.registered_at,
                    "title": f"Visit {visit.visit_number}",
                    "action": "Visit Created",
                    "staff": _staff_name(visit.performed_by),
                    "status": visit.status,
                    "priority": visit.priority,
                    "visit_id": str(visit.id),
                    "details": {
                        "chief_complaint": visit.chief_complaint,
                        "diagnosis": consultation.diagnosis if consultation else "",
                    },
                }
            )

        for vitals in Vitals.objects.filter(visit__student=student).select_related("visit", "performed_by"):
            items.append(
                {
                    "kind": "vitals",
                    "timestamp": vitals.created_at,
                    "title": "Vitals Recorded",
                    "action": "Vitals Recorded",
                    "staff": _staff_name(vitals.performed_by),
                    "status": "completed",
                    "visit_id": str(vitals.visit_id),
                    "details": {
                        "temperature_c": vitals.temperature_c,
                        "blood_pressure": f"{vitals.blood_pressure_systolic}/{vitals.blood_pressure_diastolic}"
                        if vitals.blood_pressure_systolic and vitals.blood_pressure_diastolic
                        else "",
                        "pulse_rate": vitals.pulse_rate,
                        "respiratory_rate": vitals.respiratory_rate,
                        "weight_kg": vitals.weight_kg,
                        "height_cm": vitals.height_cm,
                    },
                }
            )

        for consultation in Consultation.objects.filter(visit__student=student).select_related("visit", "performed_by"):
            items.append(
                {
                    "kind": "consultation",
                    "timestamp": consultation.created_at,
                    "title": "Consultation Completed",
                    "action": "Consultation Completed",
                    "staff": _staff_name(consultation.performed_by),
                    "status": "completed",
                    "visit_id": str(consultation.visit_id),
                    "details": {
                        "diagnosis": consultation.diagnosis,
                        "assessment": consultation.assessment,
                        "plan": consultation.plan,
                    },
                }
            )

        for record in StudentMedicalRecord.objects.filter(student=student, is_active=True).select_related("visit", "performed_by"):
            items.append(
                {
                    "kind": "medical_record",
                    "timestamp": record.diagnosed_at or record.created_at,
                    "title": record.title,
                    "action": "Medical Record Added",
                    "staff": _staff_name(record.performed_by),
                    "status": record.record_type,
                    "visit_id": str(record.visit_id) if record.visit_id else None,
                    "details": {
                        "record_type": record.record_type,
                        "details": record.details,
                        "performed_by": _staff_name(record.performed_by),
                    },
                }
            )

        for prescription in Prescription.objects.filter(visit__student=student).select_related("visit", "performed_by").prefetch_related("items"):
            items.append(
                {
                    "kind": "prescription",
                    "timestamp": prescription.dispensed_at or prescription.created_at,
                    "title": prescription.prescription_number,
                    "action": "Medication Dispensed" if prescription.status == "dispensed" else "Prescription Issued",
                    "staff": _staff_name(prescription.performed_by),
                    "status": prescription.status,
                    "visit_id": str(prescription.visit_id),
                    "details": {"items": [item.drug_name for item in prescription.items.all()]},
                }
            )

        for lab_request in LabRequest.objects.filter(visit__student=student).select_related("visit", "performed_by").prefetch_related("tests"):
            items.append(
                {
                    "kind": "lab_request",
                    "timestamp": lab_request.requested_at,
                    "title": lab_request.request_number,
                    "action": "Lab Request Created",
                    "staff": _staff_name(lab_request.performed_by),
                    "status": lab_request.status,
                    "visit_id": str(lab_request.visit_id),
                    "details": {
                        "test_name": lab_request.test_name,
                        "test_count": lab_request.tests.count(),
                        "clinical_notes": lab_request.clinical_notes,
                    },
                }
            )

        for result in (
            LabResult.objects.filter(visit__student=student)
            .select_related("lab_request", "visit", "performed_by")
            .prefetch_related("lab_request__tests")
        ):
            tests = list(result.lab_request.tests.all())
            items.append(
                {
                    "kind": "lab_result",
                    "timestamp": result.released_at,
                    "title": result.lab_request.request_number,
                    "action": "Lab Result Uploaded",
                    "staff": _staff_name(result.performed_by),
                    "status": "abnormal" if result.is_abnormal else "normal",
                    "visit_id": str(result.visit_id),
                    "details": {
                        "summary": result.result_summary,
                        "tests": [
                            {
                                "test_name": test.test_name,
                                "result_value": test.result_value,
                                "reference_range": test.reference_range,
                                "interpretation": test.interpretation,
                                "technician_notes": test.technician_notes,
                                "comments": test.comments,
                                "completed_at": test.completed_at,
                            }
                            for test in tests
                        ],
                    },
                }
            )

        for follow_up in FollowUp.objects.filter(patient=student).select_related("visit", "doctor"):
            items.append(
                {
                    "kind": "follow_up",
                    "timestamp": follow_up.scheduled_date or follow_up.created_at,
                    "title": f"Follow-up: {follow_up.follow_up_type}",
                    "action": "Follow-Up Scheduled",
                    "staff": _staff_name(follow_up.doctor),
                    "status": follow_up.status,
                    "visit_id": str(follow_up.visit_id) if follow_up.visit_id else None,
                    "details": {
                        "scheduled_date": follow_up.scheduled_date,
                        "notes": follow_up.notes,
                        "doctor": _staff_name(follow_up.doctor),
                    },
                }
            )

        for appointment in Appointment.objects.filter(student=student).select_related("visit", "performed_by"):
            items.append(
                {
                    "kind": "appointment",
                    "timestamp": appointment.scheduled_at,
                    "title": appointment.title,
                    "action": "Appointment Scheduled",
                    "staff": _staff_name(appointment.performed_by),
                    "status": appointment.status,
                    "visit_id": str(appointment.visit_id) if appointment.visit_id else None,
                    "details": {
                        "notes": appointment.notes,
                        "department": appointment.department,
                    },
                }
            )

        for event in EmergencyEvent.objects.filter(student=student).select_related("visit", "assigned_workstation"):
            items.append(
                {
                    "kind": "emergency",
                    "timestamp": event.created_at,
                    "title": "Emergency event",
                    "action": "Emergency Event",
                    "staff": event.assigned_workstation.station_name if event.assigned_workstation else "",
                    "status": event.status,
                    "visit_id": str(event.visit_id) if event.visit_id else None,
                    "details": {
                        "description": event.description,
                        "assigned_workstation": event.assigned_workstation.station_name if event.assigned_workstation else None,
                    },
                }
            )

        for plan in TreatmentSchedule.objects.filter(student=student).select_related("visit", "performed_by"):
            items.append(
                {
                    "kind": "treatment_plan",
                    "timestamp": plan.created_at,
                    "title": plan.title,
                    "action": "Treatment Plan Created",
                    "staff": _staff_name(plan.performed_by),
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
