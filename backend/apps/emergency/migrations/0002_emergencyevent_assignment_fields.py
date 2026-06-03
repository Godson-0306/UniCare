from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_studentprofile_medical_notes"),
        ("emergency", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="emergencyevent",
            name="assigned_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="emergencyevent",
            name="assigned_workstation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_emergency_events",
                to="accounts.workstationaccount",
            ),
        ),
    ]
