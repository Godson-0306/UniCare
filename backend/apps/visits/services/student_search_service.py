from django.db.models import Q

from apps.accounts.models import StudentProfile


class StudentSearchService:
    @staticmethod
    def search_by_matric(matric_number: str) -> StudentProfile | None:
        return (
            StudentProfile.objects.select_related("user")
            .filter(matric_number__iexact=matric_number.strip())
            .first()
        )

    @staticmethod
    def search_by_name(query: str, limit: int = 20) -> list[StudentProfile]:
        q = query.strip()
        if not q:
            return []
        return list(
            StudentProfile.objects.select_related("user")
            .filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(other_names__icontains=q)
                | Q(matric_number__icontains=q)
            )
            .order_by("last_name", "first_name")[:limit]
        )
