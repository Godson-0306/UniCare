from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("visits", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="visit",
            name="status",
            field=models.CharField(
                choices=[
                    ("created", "Created"),
                    ("in_nurse_queue", "In Nurse Queue"),
                    ("vitals_recorded", "Vitals Completed"),
                    ("in_doctor_consultation", "In Doctor Queue"),
                    ("consultation_completed", "Consultation Completed"),
                    ("awaiting_lab_results", "Awaiting Lab Results"),
                    ("lab_requested", "Lab Requested"),
                    ("pharmacy_processing", "Pharmacy Processing"),
                    ("completed", "Completed"),
                    ("closed", "Closed"),
                    ("cancelled", "Cancelled"),
                ],
                db_index=True,
                default="created",
                max_length=32,
            ),
        ),
    ]
