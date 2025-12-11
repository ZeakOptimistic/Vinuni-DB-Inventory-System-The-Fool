# backend/src/apps/accounts/models.py
from django.db import models


class Role(models.Model):
    """
    Simple lookup table for user roles.

    Typical rows:
    - ADMIN
    - MANAGER
    - CLERK
    """
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        # Table is managed by SQL scripts, not Django migrations
        managed = False
        db_table = "role"

    def __str__(self) -> str:
        return self.role_name


class AppUser(models.Model):
    """
    Lightweight user model mapped to MySQL app_user table.

    Roles (via Role.role_name):

    - ADMIN   : full access, including master data + stock movement.
    - MANAGER : same as ADMIN for day-to-day operations.
    - CLERK   : read-only on master data; can create sales orders,
                but cannot create purchase orders, receive stock, or transfer.
    """
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=100, unique=True)
    password_hash = models.CharField(max_length=255)
    full_name = models.CharField(max_length=150, blank=True, null=True)
    email = models.CharField(max_length=150, blank=True, null=True)
    role = models.ForeignKey(Role, on_delete=models.DO_NOTHING)
    status = models.CharField(max_length=8)  # 'ACTIVE' / 'INACTIVE'
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "app_user"

    # ---- Helpers used by DRF / permissions ----

    @property
    def is_active(self) -> bool:
        return self.status == "ACTIVE"

    @property
    def is_authenticated(self) -> bool:
        # Instances loaded from JWT are considered authenticated
        return True

    @property
    def role_name(self) -> str | None:
        return self.role.role_name if self.role else None

    @property
    def is_staff(self) -> bool:
        """
        Treat ADMIN and MANAGER as staff users.
        """
        return self.role_name in ["ADMIN", "MANAGER"]

    def __str__(self) -> str:
        return self.username
