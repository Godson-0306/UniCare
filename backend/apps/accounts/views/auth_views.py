from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.serializers import (
    AdminLoginSerializer,
    StudentLoginSerializer,
    StudentRegistrationSerializer,
    UnifiedLoginSerializer,
    UserSerializer,
    WorkstationAccountSerializer,
    WorkstationLoginSerializer,
)
from apps.accounts.services.auth_service import AuthService, AuthenticationError
from apps.accounts.services.student_onboarding_service import StudentOnboardingService


def _login_response(result: dict) -> Response:
    data = {
        "access": result["tokens"]["access"],
        "refresh": result["tokens"]["refresh"],
        "user": UserSerializer(result["user"]).data,
    }
    if "workstation" in result:
        data["workstation"] = WorkstationAccountSerializer(result["workstation"]).data
    return Response({"success": True, "data": data})


class UnifiedLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UnifiedLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = AuthService.authenticate_login(
                serializer.validated_data["identifier"],
                serializer.validated_data["password"],
            )
        except AuthenticationError as exc:
            return Response({"success": False, "error": {"message": str(exc)}}, status=401)
        return _login_response(result)


class StudentLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StudentLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = AuthService.authenticate_student(
                serializer.validated_data["matric_number"],
                serializer.validated_data["password"],
            )
        except AuthenticationError as exc:
            return Response({"success": False, "error": {"message": str(exc)}}, status=401)
        return _login_response(result)


class WorkstationLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = WorkstationLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = AuthService.authenticate_workstation(
                serializer.validated_data["station_username"],
                serializer.validated_data["password"],
            )
        except AuthenticationError as exc:
            return Response({"success": False, "error": {"message": str(exc)}}, status=401)
        return _login_response(result)


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = AuthService.authenticate_admin(
                serializer.validated_data["username"],
                serializer.validated_data["password"],
            )
        except AuthenticationError as exc:
            return Response({"success": False, "error": {"message": str(exc)}}, status=401)
        return _login_response(result)


class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            response.data = {"success": True, "data": response.data}
        return response


class StudentRegistrationView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "student_signup"

    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = StudentOnboardingService.register_student(**serializer.validated_data)
        return Response(
            {
                "success": True,
                "data": {
                    "student_id": str(profile.id),
                    "matric_number": profile.matric_number,
                    "full_name": profile.full_name,
                },
            },
            status=status.HTTP_201_CREATED,
        )
