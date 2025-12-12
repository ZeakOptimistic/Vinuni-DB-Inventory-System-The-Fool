# backend/src/apps/accounts/serializers.py
from django.utils import timezone
from rest_framework import serializers

from .models import AppUser, Role
from .services import hash_password


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["role_id", "role_name", "description"]


class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.role_name", read_only=True)
    role_id = serializers.IntegerField(source="role.role_id", read_only=True)

    class Meta:
        model = AppUser
        fields = [
            "user_id",
            "username",
            "full_name",
            "email",
            "role_id",
            "role_name",
            "status",
            "created_at",
        ]


class UserUpsertSerializer(serializers.ModelSerializer):
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source="role",
        write_only=True,
    )
    role_name = serializers.CharField(source="role.role_name", read_only=True)

    # password only used when creating or changing password
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = AppUser
        fields = [
            "user_id",
            "username",
            "full_name",
            "email",
            "role_id",
            "role_name",
            "status",
            "created_at",
            "password",
        ]
        read_only_fields = ["user_id", "created_at", "role_name"]

    def create(self, validated_data):
        raw_password = validated_data.pop("password", None)
        if not raw_password:
            raw_password = "123456"  # default demo password

        validated_data["password_hash"] = hash_password(raw_password)

        # app_user.created_at has a DEFAULT in DB, but unmanaged Django model usually still needs a value
        validated_data["created_at"] = timezone.now()

        return AppUser.objects.create(**validated_data)

    def update(self, instance, validated_data):
        raw_password = validated_data.pop("password", None)
        if raw_password:
            instance.password_hash = hash_password(raw_password)

        # update normal field
        for k, v in validated_data.items():
            setattr(instance, k, v)

        instance.save()
        return instance


class SetStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["ACTIVE", "INACTIVE"])
