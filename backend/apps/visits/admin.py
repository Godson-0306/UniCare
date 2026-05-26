from django.contrib import admin

from apps.visits.models import Consultation, QueueEntry, ReceptionLog, Visit, Vitals


class VitalsInline(admin.TabularInline):
    model = Vitals
    extra = 0


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("visit_number", "student", "status", "priority", "registered_at")
    list_filter = ("status", "priority", "is_emergency")
    search_fields = ("visit_number", "student__matric_number")
    inlines = [VitalsInline]


admin.site.register(ReceptionLog)
admin.site.register(QueueEntry)
admin.site.register(Consultation)
admin.site.register(Vitals)
