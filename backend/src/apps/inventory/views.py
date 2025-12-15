# backend/src/apps/inventory/views.py
from django.utils import timezone
from rest_framework import viewsets, status as drf_status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Category, Supplier, Location, Product
from .serializers import (
    CategorySerializer,
    SupplierSerializer,
    LocationSerializer,
    ProductSerializer,
)
from apps.accounts.permissions import ReadOnlyOrStaff

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrStaff]
    search_fields = ["name", "description"]
    ordering_fields = ["name"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param in ("ACTIVE", "INACTIVE"):
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        category = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ("ACTIVE", "INACTIVE"):
            return Response(
                {"detail": "status must be 'ACTIVE' or 'INACTIVE'."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        category.status = new_status
        category.save(update_fields=["status"])
        serializer = self.get_serializer(category)
        return Response(serializer.data)


class SupplierViewSet(viewsets.ModelViewSet):
    """
    /api/suppliers/

    - Read: all authenticated users.
    - Write: only ADMIN / MANAGER.
    """
    queryset = Supplier.objects.all().order_by("name")
    serializer_class = SupplierSerializer
    permission_classes = [ReadOnlyOrStaff]
    search_fields = ["name", "contact_name", "email", "phone"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param in ("ACTIVE", "INACTIVE"):
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        """
        POST /api/suppliers/{id}/set-status/
        Body: { "status": "ACTIVE" | "INACTIVE" }
        """
        supplier = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ("ACTIVE", "INACTIVE"):
            return Response(
                {"detail": "status must be 'ACTIVE' or 'INACTIVE'."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        supplier.status = new_status
        supplier.save(update_fields=["status"])

        serializer = self.get_serializer(supplier)
        return Response(serializer.data)

class LocationViewSet(viewsets.ModelViewSet):
    """
    /api/locations/

    - Read: all authenticated users.
    - Write: only ADMIN / MANAGER.
    """
    queryset = Location.objects.all().order_by("name")
    serializer_class = LocationSerializer
    permission_classes = [ReadOnlyOrStaff]
    search_fields = ["name", "address"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        """
        Optionally filter by ?status=ACTIVE or ?status=INACTIVE.
        """
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param in ("ACTIVE", "INACTIVE"):
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        """
        POST /api/locations/{id}/set-status/
        Body: { "status": "ACTIVE" | "INACTIVE" }
        """
        location = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ("ACTIVE", "INACTIVE"):
            return Response(
                {"detail": "status must be 'ACTIVE' or 'INACTIVE'."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        location.status = new_status
        # Location model has no updated_at, so don't include it here
        location.save(update_fields=["status"])  # or just location.save()

        serializer = self.get_serializer(location)
        return Response(serializer.data)

class ProductViewSet(viewsets.ModelViewSet):
    """
    /api/products/

    - Read: all authenticated users.
    - Write: only ADMIN / MANAGER.
    """
    queryset = Product.objects.select_related("category").all().order_by("name")
    serializer_class = ProductSerializer
    permission_classes = [ReadOnlyOrStaff]
    search_fields = ["name", "sku", "barcode", "description"]
    ordering_fields = ["name", "created_at", "unit_price"]

    def get_queryset(self):
        """
        Optionally filter by ?status=ACTIVE or ?status=INACTIVE
        while keeping default behavior = all statuses.
        """
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param in ("ACTIVE", "INACTIVE"):
            qs = qs.filter(status=status_param)
            if status_param == "ACTIVE":
                qs = qs.filter(category__status="ACTIVE")
        return qs

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        """
        POST /api/products/{id}/set-status/
        Body: { "status": "ACTIVE" | "INACTIVE" }
        """
        product = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ("ACTIVE", "INACTIVE"):
            return Response(
                {"detail": "status must be 'ACTIVE' or 'INACTIVE'."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        product.status = new_status
        product.updated_at = timezone.now()
        product.save(update_fields=["status", "updated_at"])

        serializer = self.get_serializer(product)
        return Response(serializer.data)

