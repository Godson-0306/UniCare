from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.constants import AccountType, Role
from apps.accounts.models import StudentProfile, User, WorkstationAccount


@receiver(post_save, sender=User)
def ensure_profile_exists(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.account_type == AccountType.STUDENT and not hasattr(instance, "student_profile"):
        StudentProfile.objects.create(
            user=instance,
            matric_number=instance.username.upper(),
            first_name=instance.first_name or "",
            last_name=instance.last_name or "",
        )
    if instance.account_type == AccountType.WORKSTATION and not hasattr(instance, "workstation_profile"):
        WorkstationAccount.objects.create(
            user=instance,
            station_name=instance.username,
            station_code=instance.username,
            assigned_role=instance.role,
        )
