# backend/src/apps/accounts/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

def _get_role_name(user):
    # user.role can be a string or a FK Role
    role = getattr(user, "role", None)
    if isinstance(role, str):
        return role
    if role is not None:
        return getattr(role, "role_name", None)
    return getattr(user, "role_name", None)

class IsAdmin(BasePermission):
    """
    Allow access only for users whose role_name is 'ADMIN'.
    """

    message = "Only ADMIN users are allowed to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and getattr(user, "role_name", None) == "ADMIN")


class IsManagerOrAdmin(BasePermission):
    """
    Allow access for users whose role_name is either 'ADMIN' or 'MANAGER'.
    """

    message = "Only ADMIN or MANAGER users are allowed to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        role = getattr(user, "role_name", None)
        return bool(user and role in ["ADMIN", "MANAGER"])


class ReadOnlyOrStaff(BasePermission):
    """
    Generic permission used for master data & some stock operations.

    - SAFE methods (GET, HEAD, OPTIONS):
        Allowed for any authenticated user (ADMIN / MANAGER / CLERK).

    - Write methods (POST, PUT, PATCH, DELETE):
        Restricted to ADMIN and MANAGER only.

    This makes CLERK users effectively read-only on resources that use this
    permission class.
    """

    message = "Write operations are restricted to ADMIN or MANAGER users."

    def has_permission(self, request, view) -> bool:
        user = request.user

        # Any logged-in user can read
        if request.method in SAFE_METHODS:
            return bool(user and user.is_authenticated)

        # Non-safe methods require elevated role
        role = getattr(user, "role_name", None)
        return bool(user and role in ["ADMIN", "MANAGER"])
