from apps.visits.constants import QueueStage, QueueStatus
from apps.visits.models import QueueEntry


def build_ops_queues(*, sample_size: int = 8) -> dict:
    stages = []
    for stage in QueueStage.values:
        waiting_qs = (
            QueueEntry.objects.filter(stage=stage, status=QueueStatus.WAITING)
            .select_related("visit", "visit__student")
            .order_by("position", "created_at")
        )
        in_progress_qs = QueueEntry.objects.filter(stage=stage, status=QueueStatus.IN_PROGRESS)
        waiting_sample = [
            {
                "entry_id": str(entry.id),
                "visit_id": str(entry.visit_id),
                "visit_number": entry.visit.visit_number,
                "student_name": entry.visit.student.full_name,
                "matric_number": entry.visit.student.matric_number,
                "priority": entry.visit.priority,
                "position": entry.position,
                "created_at": entry.created_at,
            }
            for entry in waiting_qs[:sample_size]
        ]
        stages.append(
            {
                "stage": stage,
                "waiting": waiting_qs.count(),
                "in_progress": in_progress_qs.count(),
                "oldest_waiting": waiting_sample,
            }
        )
    return {"stages": stages}
