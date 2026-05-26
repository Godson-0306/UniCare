from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.constants import AccountType
from apps.accounts.serializers import StudentProfileSerializer, UserSerializer, WorkstationAccountSerializer


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {"user": UserSerializer(user).data}
        if user.account_type == AccountType.STUDENT and hasattr(user, "student_profile"):
            data["profile"] = StudentProfileSerializer(user.student_profile).data
        if user.account_type == AccountType.WORKSTATION and hasattr(user, "workstation_profile"):
            data["workstation"] = WorkstationAccountSerializer(user.workstation_profile).data
        return Response({"success": True, "data": data})
