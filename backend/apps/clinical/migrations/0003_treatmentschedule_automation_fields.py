from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clinical", "0002_studentmedicalrecord"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentschedule",
            name="appointments_generated",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="treatmentschedule",
            name="interval_days",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="treatmentschedule",
            name="occurrences_total",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="treatmentschedule",
            name="reminder_offset_minutes",
            field=models.PositiveIntegerField(default=60),
        ),
    ]
