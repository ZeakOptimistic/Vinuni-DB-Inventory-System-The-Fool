# backend/src/apps/accounts/views.py
import datetime
import jwt

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import AppUser
from .serializers import LoginSerializer
from .services import verify_user_password


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
