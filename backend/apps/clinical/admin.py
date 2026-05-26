from django.contrib import admin

from apps.clinical.models import LabRequest, LabResult, Prescription, PrescriptionItem, TreatmentSchedule


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("prescription_number", "visit", "status", "created_at")
    inlines = [PrescriptionItemInline]


admin.site.register(LabRequest)
admin.site.register(LabResult)
admin.site.register(TreatmentSchedule)
