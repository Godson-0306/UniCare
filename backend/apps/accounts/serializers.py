from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import StudentProfile, User, WorkstationAccount


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "role", "account_type", "email", "phone_number")


class StudentProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = StudentProfile
        fields = (
            "id",
            "matric_number",
            "first_name",
            "last_name",
            "other_names",
            "full_name",
            "department",
            "faculty",
            "level",
            "date_of_birth",
            "gender",
            "blood_group",
            "emergency_contact_name",
            "emergency_contact_phone",
            "medical_notes",
        )


class WorkstationAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkstationAccount
        fields = ("id", "station_name", "station_code", "assigned_role", "location", "is_active")


class UnifiedLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class StudentLoginSerializer(serializers.Serializer):
    matric_number = serializers.CharField(max_length=32)
    password = serializers.CharField(write_only=True)


class WorkstationLoginSerializer(serializers.Serializer):
    station_username = serializers.CharField(max_length=64)
    password = serializers.CharField(write_only=True)


class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class AuthTokenResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()
    workstation = WorkstationAccountSerializer(required=False)


class StudentRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    other_names = serializers.CharField(max_length=100, required=False, allow_blank=True)
    matric_number = serializers.CharField(max_length=32)
    faculty = serializers.CharField(max_length=120)
    department = serializers.CharField(max_length=120)
    level = serializers.CharField(max_length=20)
    date_of_birth = serializers.DateField()
    gender = serializers.CharField(max_length=16)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    emergency_contact_name = serializers.CharField(max_length=120)
    emergency_contact_phone = serializers.CharField(max_length=20)
    medical_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_matric_number(self, value: str) -> str:
        matric = value.strip().upper()
        if StudentProfile.objects.filter(matric_number=matric).exists():
            raise serializers.ValidationError("A student with this matric number already exists.")
        if User.objects.filter(username=matric).exists():
            raise serializers.ValidationError("A user with this matric number already exists.")
        return matric

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value
