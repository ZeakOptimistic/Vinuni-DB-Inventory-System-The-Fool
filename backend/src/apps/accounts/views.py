# backend/src/apps/accounts/views.py
import datetime
import jwt

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import status as drf_status, viewsets

from .models import AppUser, Role
from .services import verify_user_password
from .permissions import IsAdmin
from .serializers import (
    LoginSerializer,
    RoleSerializer,
    UserSerializer,
    UserUpsertSerializer,
    SetStatusSerializer,
)


class LoginView(APIView):
    authentication_classes = []  # login without auth
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        try:
            user = AppUser.objects.select_related("role").get(username=username)
        except AppUser.DoesNotExist:
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active or not verify_user_password(user, password):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = datetime.datetime.utcnow()
        payload = {
            "user_id": user.user_id,
            "role": user.role_name,
            "iat": now,
            "exp": now + datetime.timedelta(hours=24),
        }

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        return Response(
            {
                "access": token,
                "user": {
                    "id": user.user_id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "role": user.role_name,
                },
            }
        )

class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all().order_by("role_name")
    serializer_class = RoleSerializer
    permission_classes = [IsAdmin]


class UserViewSet(viewsets.ModelViewSet):
    queryset = AppUser.objects.select_related("role").all().order_by("-user_id")
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["username", "full_name", "email", "role__role_name"]
    ordering_fields = ["username", "full_name", "email", "status", "created_at", "user_id"]
    ordering = ["-user_id"]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return UserUpsertSerializer
        return UserSerializer

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        user_obj = self.get_object()

        s = SetStatusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        new_status = s.validated_data["status"]

        # optional: không cho tự deactivate chính mình
        req_user_id = getattr(request.user, "user_id", None)
        if req_user_id == user_obj.user_id and new_status == "INACTIVE":
            return Response(
                {"detail": "You cannot deactivate your own account."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        user_obj.status = new_status
        user_obj.save(update_fields=["status"])  # KHÔNG có updated_at

        return Response(UserSerializer(user_obj).data, status=drf_status.HTTP_200_OK)