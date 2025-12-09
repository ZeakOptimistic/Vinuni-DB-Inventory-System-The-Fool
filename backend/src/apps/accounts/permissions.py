# backend/src/apps/accounts/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and getattr(user, "role_name", None) == "ADMIN")


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        role = getattr(user, "role_name", None)
        return bool(user and role in ["ADMIN", "MANAGER"])


class ReadOnlyOrStaff(BasePermission):
    """
    GET: cho mọi user đã login
    Các method khác: chỉ ADMIN / MANAGER / CLERK
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        role = getattr(user, "role_name", None)
        return bool(user and role in ["ADMIN", "MANAGER", "CLERK"])
