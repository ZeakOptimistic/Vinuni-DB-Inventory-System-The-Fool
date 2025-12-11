# backend/src/apps/inventory/serializers.py
from rest_framework import serializers
from .models import Category, Supplier, Location, Product


class CategorySerializer(serializers.ModelSerializer):

    status = serializers.ChoiceField(choices=["ACTIVE", "INACTIVE"])

    class Meta:
        model = Category
        fields = "__all__"
        read_only_fields = ["category_id"]


class SupplierSerializer(serializers.ModelSerializer):

    status = serializers.ChoiceField(choices=["ACTIVE", "INACTIVE"])

    class Meta:
        model = Supplier
        fields = "__all__"
        read_only_fields = ["supplier_id", "created_at"]


class LocationSerializer(serializers.ModelSerializer):

    status = serializers.ChoiceField(choices=["ACTIVE", "INACTIVE"])

    class Meta:
        model = Location
        fields = "__all__"
        read_only_fields = ["location_id", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name", read_only=True
    )

    status = serializers.ChoiceField(choices=["ACTIVE", "INACTIVE"])

    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = [
            "product_id",
            "created_at",
            "updated_at",
            "category_name",
        ]

