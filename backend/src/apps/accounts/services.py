# backend/src/apps/accounts/services.py
from django.contrib.auth.hashers import make_password, check_password
from .models import AppUser


def set_user_password(user: AppUser, raw_password: str):
    """
    Use in shell to reset password_hash for seeded user.
    """
    user.password_hash = make_password(raw_password)
    user.save(update_fields=["password_hash"])


def verify_user_password(user: AppUser, raw_password: str) -> bool:
    """
    Check insert password with stored password_hash.
    """
    return check_password(raw_password, user.password_hash)
