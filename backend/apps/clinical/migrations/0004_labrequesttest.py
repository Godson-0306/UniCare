import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def create_tests_for_existing_requests(apps, schema_editor):
    LabRequest = apps.get_model("clinical", "LabRequest")
    LabRequestTest = apps.get_model("clinical", "LabRequestTest")

    for lab_request in LabRequest.objects.all():
        if LabRequestTest.objects.filter(lab_request=lab_request).exists():
            continue
        LabRequestTest.objects.create(
            lab_request=lab_request,
            test_name=lab_request.test_name,
            test_code=lab_request.test_code,
            status=lab_request.status,
            completed_at=lab_request.completed_at,
            performed_by=lab_request.performed_by,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("clinical", "0003_treatmentschedule_automation_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LabRequestTest",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("test_name", models.CharField(max_length=200)),
                ("test_code", models.CharField(blank=True, max_length=64)),
                ("result_value", models.TextField(blank=True)),
                ("reference_range", models.CharField(blank=True, max_length=200)),
                ("comments", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("in_progress", "In Progress"),
                            ("completed", "Completed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "lab_request",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tests",
                        to="clinical.labrequest",
                    ),
                ),
                (
                    "performed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_actions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "clinical_lab_request_test",
                "ordering": ["created_at"],
                "indexes": [models.Index(fields=["lab_request", "status"], name="clinical_la_lab_req_3a9cdb_idx")],
            },
        ),
        migrations.RunPython(create_tests_for_existing_requests, migrations.RunPython.noop),
    ]
