# backend/src/apps/orders/serializers.py
from datetime import date
from decimal import Decimal

from django.db import transaction, connection
from django.core.exceptions import ObjectDoesNotExist

from rest_framework import serializers

from apps.inventory.models import Product, Location, Supplier
from apps.orders.models import (
    SalesOrder,
    SalesOrderItem,
    PurchaseOrder,
    PurchaseOrderItem,
)


# ============================
# 1. SALES ORDER SERIALIZERS
# ============================

class SalesOrderItemInputSerializer(serializers.Serializer):
    """
    Input item cho POST /api/sales-orders/
    """
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
    )
    discount = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        default=Decimal("0.00"),
    )

    def validate_product_id(self, value):
        if not Product.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Product does not exist.")
        return value


class SalesOrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer returns the item in the response.
    """
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = SalesOrderItem
        fields = [
            "product_id",
            "product_name",
            "sku",
            "quantity",
            "unit_price",
            "discount",
            "line_total",
        ]


class SalesOrderSerializer(serializers.ModelSerializer):
    """
    Serializer returns SalesOrder + nested items.
    """
    location_name = serializers.CharField(source="location.name", read_only=True)
    items = SalesOrderItemSerializer(
        source="salesorderitem_set",
        many=True,
        read_only=True,
    )

    class Meta:
        model = SalesOrder
        fields = [
            "so_id",
            "location_id",
            "location_name",
            "order_date",
            "customer_name",
            "status",
            "total_amount",
            "created_by_id",
            "created_at",
            "items",
        ]


class SalesOrderCreateSerializer(serializers.Serializer):
    """
    Use for POST /api/sales-orders/
    """
    location_id = serializers.IntegerField()
    customer_name = serializers.CharField(
        allow_blank=True,
        required=False,
    )
    order_date = serializers.DateField(required=False)
    items = SalesOrderItemInputSerializer(many=True)

    def validate_location_id(self, value):
        if not Location.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Location does not exist.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must have at least 1 item.")
        return value

    def create(self, validated_data):
        """
        - Create Sales Order (status DRAFT)
        - Create SalesOrderItem
        - Call sp_confirm sales_order(so _id, user_id) to deduct inventory
        """
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user is None or not user.is_authenticated:
            raise serializers.ValidationError("Invalid user.")

        try:
            location = Location.objects.get(pk=validated_data["location_id"])
        except ObjectDoesNotExist:
            raise serializers.ValidationError({"location_id": "Location does not exist."})

        items_data = validated_data.pop("items")
        order_date = validated_data.get("order_date") or date.today()
        customer_name = validated_data.get("customer_name", "")

        # Map product
        product_ids = [item["product_id"] for item in items_data]
        products = Product.objects.filter(pk__in=product_ids)
        product_map = {p.pk: p for p in products}

        lines = []
        total_amount = Decimal("0.00")

        for item in items_data:
            product_id = item["product_id"]
            product = product_map.get(product_id)
            if not product:
                raise serializers.ValidationError(
                    {"items": [f"Product id {product_id} does not exist."]}
                )

            quantity = item["quantity"]
            unit_price = item.get("unit_price") or product.unit_price
            discount = item.get("discount") or Decimal("0.00")

            line_total = (unit_price * quantity) * (
                Decimal("1.00") - (discount / Decimal("100.00"))
            )

            total_amount += line_total

            lines.append({
                "product": product,
                "quantity": quantity,
                "unit_price": unit_price,
                "discount": discount,
                "line_total": line_total,
            })

        user_pk = getattr(user, "user_id", getattr(user, "pk", None))
        if user_pk is None:
            raise serializers.ValidationError("Unable to determine user_id.")

        with transaction.atomic():
            # 1) Create SalesOrder
            so = SalesOrder.objects.create(
                location=location,
                order_date=order_date,
                customer_name=customer_name,
                total_amount=total_amount,
                created_by_id=user_pk,
            )
            so_pk = getattr(so, "so_id", so.pk)

            # 2) Create SalesOrderItem
            soi_objects = []
            for line in lines:
                soi_objects.append(
                    SalesOrderItem(
                        so_id=so_pk,
                        product=line["product"],
                        quantity=line["quantity"],
                        unit_price=line["unit_price"],
                        discount=line["discount"],
                        line_total=line["line_total"],
                    )
                )
            SalesOrderItem.objects.bulk_create(soi_objects)

            # 3) Call stored procedure confirm order + subtract stock
            with connection.cursor() as cursor:
                cursor.callproc("sp_confirm_sales_order", [so_pk, user_pk])

            # 4) Refresh status after procedure runs
            so.refresh_from_db()

        return so


# ============================
# 2. PURCHASE ORDER SERIALIZERS
# ============================

class PurchaseOrderItemInputSerializer(serializers.Serializer):
    """
    Input item for POST /api/purchase-orders/
    """
    product_id = serializers.IntegerField()
    ordered_qty = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
    )

    def validate_product_id(self, value):
        if not Product.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Product does not exist.")
        return value


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "product_id",
            "product_name",
            "sku",
            "ordered_qty",
            "received_qty",
            "unit_price",
            "line_total",
        ]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)
    items = PurchaseOrderItemSerializer(
        source="purchaseorderitem_set",
        many=True,
        read_only=True,
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            "po_id",
            "supplier_id",
            "supplier_name",
            "location_id",
            "location_name",
            "order_date",
            "expected_date",
            "status",
            "total_amount",
            "created_by_id",
            "created_at",
            "items",
        ]


class PurchaseOrderCreateSerializer(serializers.Serializer):
    """
    Use for POST /api/purchase-orders/
    """
    supplier_id = serializers.IntegerField()
    location_id = serializers.IntegerField()
    order_date = serializers.DateField(required=False)
    expected_date = serializers.DateField(required=False, allow_null=True)
    items = PurchaseOrderItemInputSerializer(many=True)

    def validate_supplier_id(self, value):
        if not Supplier.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Supplier does not exist.")
        return value

    def validate_location_id(self, value):
        if not Location.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Location does not exist.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("The import order must have at least 1 item.")
        return value

    def create(self, validated_data):
        """
        - Create PurchaseOrder (status APPROVED)
        - Create PurchaseOrderItem
        (receive goods & stock movement processed in another view)
        """
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user is None or not user.is_authenticated:
            raise serializers.ValidationError("Invalid user.")

        supplier_id = validated_data["supplier_id"]
        location_id = validated_data["location_id"]
        items_data = validated_data["items"]

        order_date = validated_data.get("order_date") or date.today()
        expected_date = validated_data.get("expected_date")

        try:
            supplier = Supplier.objects.get(pk=supplier_id)
        except ObjectDoesNotExist:
            raise serializers.ValidationError({"supplier_id": "Supplier does not exist."})

        try:
            location = Location.objects.get(pk=location_id)
        except ObjectDoesNotExist:
            raise serializers.ValidationError({"location_id": "Location does not exist."})

        # Map product
        product_ids = [item["product_id"] for item in items_data]
        products = Product.objects.filter(pk__in=product_ids)
        product_map = {p.pk: p for p in products}

        lines = []
        total_amount = Decimal("0.00")

        for item in items_data:
            product_id = item["product_id"]
            product = product_map.get(product_id)
            if not product:
                raise serializers.ValidationError(
                    {"items": [f"Product id {product_id} does not exist."]}
                )

            ordered_qty = item["ordered_qty"]
            unit_price = item.get("unit_price") or product.unit_price

            line_total = unit_price * ordered_qty
            total_amount += line_total

            lines.append({
                "product": product,
                "ordered_qty": ordered_qty,
                "unit_price": unit_price,
                "line_total": line_total,
            })

        user_pk = getattr(user, "user_id", getattr(user, "pk", None))
        if user_pk is None:
            raise serializers.ValidationError("Unable to determine user_id.")

        with transaction.atomic():
            # 1) Create PurchaseOrder
            po = PurchaseOrder.objects.create(
                supplier=supplier,
                location=location,
                order_date=order_date,
                expected_date=expected_date,
                status="APPROVED",
                total_amount=total_amount,
                created_by_id=user_pk,
            )

            # 2) Create PurchaseOrderItem
            poi_objs = []
            for line in lines:
                poi_objs.append(
                    PurchaseOrderItem(
                        po=po,
                        product=line["product"],
                        ordered_qty=line["ordered_qty"],
                        received_qty=0,
                        unit_price=line["unit_price"],
                        line_total=line["line_total"],
                    )
                )
            PurchaseOrderItem.objects.bulk_create(poi_objs)

        return po
