"""Generated migration for FollowUp model."""
from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings
import uuid


class Migration(migrations.Migration):

    initial = False

    dependencies = [
        ("clinical", "0006_labrequesttest_interpretation_and_more"),
        ("accounts", "0002_studentprofile_medical_notes"),
        ("visits", "0002_alter_visit_status"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FollowUp",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("follow_up_type", models.CharField(default="other", max_length=32)),
                ("scheduled_date", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("status", models.CharField(default="pending", max_length=16)),
                (
                    "patient",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="follow_ups", to="accounts.studentprofile"),
                ),
                (
                    "visit",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="follow_ups", to="visits.visit"),
                ),
                (
                    "doctor",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_follow_ups", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "db_table": "clinical_follow_up",
                "ordering": ["-scheduled_date", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="followup",
            index=models.Index(fields=["patient", "status"], name="clinical_follow_up_patient_status_idx"),
        ),
        migrations.AddIndex(
            model_name="followup",
            index=models.Index(fields=["visit", "scheduled_date"], name="clinical_follow_up_visit_scheduled_idx"),
        ),
    ]
