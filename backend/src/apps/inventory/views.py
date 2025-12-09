# backend/src/apps/inventory/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Category, Supplier, Location, Product
from .serializers import (
    CategorySerializer,
    SupplierSerializer,
    LocationSerializer,
    ProductSerializer,
)
from apps.accounts.permissions import ReadOnlyOrStaff, IsManagerOrAdmin


class CategoryViewSet(viewsets.ModelViewSet):
    """
    /api/categories/
    """
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrStaff]
    search_fields = ["name", "description"]
    ordering_fields = ["name"]


class SupplierViewSet(viewsets.ModelViewSet):
    """
    /api/suppliers/
    """
    queryset = Supplier.objects.all().order_by("name")
    serializer_class = SupplierSerializer
    permission_classes = [ReadOnlyOrStaff]
    search_fields = ["name", "contact_name", "email", "phone"]
    ordering_fields = ["name", "created_at"]


class LocationViewSet(viewsets.ModelViewSet):
    """
    /api/locations/
    """
    queryset = Location.objects.all().order_by("name")
    serializer_class = LocationSerializer
    permission_classes = [ReadOnlyOrStaff]
    search_fields = ["name", "type", "address"]
    ordering_fields = ["name", "created_at"]


class ProductViewSet(viewsets.ModelViewSet):
    """
    /api/products/
    """
    queryset = Product.objects.select_related("category").all().order_by("name")
    serializer_class = ProductSerializer
    permission_classes = [ReadOnlyOrStaff]
    search_fields = ["name", "sku", "barcode", "description"]
    ordering_fields = ["name", "created_at", "unit_price"]
