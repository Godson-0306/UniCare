from django.db.models import Q

from apps.accounts.models import StudentProfile


class StudentSearchService:
    @staticmethod
    def normalize_query(value: str) -> str:
        return " ".join(value.strip().split())

    @staticmethod
    def search_by_matric(matric_number: str) -> StudentProfile | None:
        normalized = StudentSearchService.normalize_query(matric_number).upper()
        if not normalized:
            return None
        return (
            StudentProfile.objects.select_related("user")
            .prefetch_related("visits", "emergency_events")
            .filter(matric_number__iexact=normalized)
            .first()
        )

    @staticmethod
    def search_by_name(query: str, limit: int = 20) -> list[StudentProfile]:
        q = StudentSearchService.normalize_query(query)
        if not q:
            return []
        tokens = [token for token in q.split(" ") if token]
        queryset = StudentProfile.objects.select_related("user").prefetch_related("visits", "emergency_events")
        for token in tokens:
            queryset = queryset.filter(
                Q(first_name__icontains=token)
                | Q(last_name__icontains=token)
                | Q(other_names__icontains=token)
                | Q(matric_number__icontains=token)
            )
        return list(queryset.order_by("last_name", "first_name")[:limit])

    @staticmethod
    def search(query: str, limit: int = 20) -> list[StudentProfile]:
        normalized = StudentSearchService.normalize_query(query)
        if not normalized:
            return StudentSearchService.list_students(limit=limit)

        exact = StudentSearchService.search_by_matric(normalized)
        if exact:
            return [exact]

        return StudentSearchService.search_by_name(normalized, limit=limit)

    @staticmethod
    def list_students(limit: int = 100) -> list[StudentProfile]:
        return list(
            StudentProfile.objects.select_related("user")
            .prefetch_related("visits", "emergency_events")
            .order_by("last_name", "first_name")[:limit]
        )
