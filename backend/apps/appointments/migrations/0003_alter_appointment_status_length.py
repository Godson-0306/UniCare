from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0002_appointment_ongoing_and_missed"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appointment",
            name="status",
            field=models.CharField(
                choices=[
                    ("scheduled", "Scheduled"),
                    ("confirmed", "Confirmed"),
                    ("completed", "Completed"),
                    ("cancelled", "Cancelled"),
                    ("missed", "Missed"),
                    ("ongoing_treatment", "Ongoing Treatment"),
                ],
                db_index=True,
                default="scheduled",
                max_length=32,
            ),
        ),
    ]
