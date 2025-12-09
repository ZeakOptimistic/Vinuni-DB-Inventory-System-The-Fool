# backend/src/apps/accounts/models.py
from django.db import models


class Role(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False  # create table by SQL script, Django can not touch
        db_table = "role"

    def __str__(self):
        return self.role_name


class AppUser(models.Model):
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

    # DRF and permission use like default User
    @property
    def is_active(self):
        return self.status == "ACTIVE"

    @property
    def is_authenticated(self):
        return True

    @property
    def role_name(self):
        return self.role.role_name if self.role else None

    def __str__(self):
        return self.username
