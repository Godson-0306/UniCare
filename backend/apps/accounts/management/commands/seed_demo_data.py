from django.core.management.base import BaseCommand

from apps.accounts.constants import Role
from apps.accounts.models import StudentProfile, User, WorkstationAccount


class Command(BaseCommand):
    help = "Seed demo workstation accounts and a sample student."

    def handle(self, *args, **options):
        student_user, created = User.objects.get_or_create(
            username="U2024001",
            defaults={
                "role": Role.STUDENT,
                "account_type": "student",
                "first_name": "Ada",
                "last_name": "Okafor",
                "email": "ada.okafor@example.edu",
            },
        )
        if created:
            student_user.set_password("student123")
            student_user.save()
            self.stdout.write(self.style.SUCCESS("Created demo student U2024001 / student123"))
        StudentProfile.objects.update_or_create(
            user=student_user,
            defaults={
                "matric_number": "U2024001",
                "first_name": "Ada",
                "last_name": "Okafor",
                "department": "Computer Science",
                "faculty": "Science",
                "level": "300",
                "gender": "Female",
                "emergency_contact_name": "Mrs Okafor",
                "emergency_contact_phone": "+2348000000001",
            },
        )

        workstations = [
            ("reception_station", Role.RECEPTIONIST, "Reception Desk"),
            ("nurse_station", Role.NURSE, "Nurse Station"),
            ("doctor_station", Role.DOCTOR, "Doctor Station"),
            ("pharmacy_station", Role.PHARMACIST, "Pharmacy Desk"),
            ("lab_station", Role.LAB_TECHNICIAN, "Laboratory"),
            ("duty_station", Role.DUTY_OFFICER, "Duty Officer Desk"),
        ]
        for username, role, station_name in workstations:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"role": role, "account_type": "workstation", "is_staff": True},
            )
            if created:
                user.set_password("workstation123")
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created workstation {username} / workstation123"))
            WorkstationAccount.objects.update_or_create(
                user=user,
                defaults={
                    "station_name": station_name,
                    "station_code": username,
                    "assigned_role": role,
                },
            )

        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={"role": Role.ADMIN, "account_type": "personal", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password("admin123")
            admin.save()
            self.stdout.write(self.style.SUCCESS("Created admin / admin123"))
