# backend/src/apps/accounts/authentication.py
import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from .models import AppUser


class JWTAuthentication(BaseAuthentication):
    """
    Read header: Authorization: Bearer <token>
    Decode JWT and return (user, None)
    """
    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token = parts[1]

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token expired")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed("Invalid token")

        user_id = payload.get("user_id")
        if not user_id:
            raise exceptions.AuthenticationFailed("Invalid token payload")

        try:
            user = AppUser.objects.select_related("role").get(
                pk=user_id, status="ACTIVE"
            )
        except AppUser.DoesNotExist:
            raise exceptions.AuthenticationFailed("User not found")

        # Let DRF know the user is authenticated
        # user.is_authenticated = True
        return (user, None)
