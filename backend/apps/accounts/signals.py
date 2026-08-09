import os

from django.core.management import call_command
from django.db.models.signals import post_migrate, post_save
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


_seed_connected = False


def connect_seed_on_migrate():
    global _seed_connected
    if _seed_connected:
        return
    post_migrate.connect(_seed_demo_after_migrate, dispatch_uid="unicare_seed_demo_on_migrate")
    _seed_connected = True


def _seed_demo_after_migrate(sender, app_config, **kwargs):
    if os.environ.get("SEED_DEMO_ON_BOOT") != "true":
        return
    if app_config.name != "apps.accounts":
        return
    if User.objects.filter(username="U2024001").exists():
        return
    call_command("seed_demo_data")
