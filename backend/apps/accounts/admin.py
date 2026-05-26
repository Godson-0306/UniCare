from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import StudentProfile, User, WorkstationAccount


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "role", "account_type", "is_active", "created_at")
    list_filter = ("role", "account_type", "is_active")
    search_fields = ("username", "email")
    ordering = ("-created_at",)
    fieldsets = BaseUserAdmin.fieldsets + (
        ("UniCare", {"fields": ("role", "account_type", "phone_number")}),
    )


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("matric_number", "full_name", "department", "created_at")
    search_fields = ("matric_number", "first_name", "last_name")


@admin.register(WorkstationAccount)
class WorkstationAccountAdmin(admin.ModelAdmin):
    list_display = ("station_name", "assigned_role", "is_active", "location")
    list_filter = ("assigned_role", "is_active")
