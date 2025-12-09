# backend/src/apps/orders/models.py
from django.db import models
from django.utils import timezone

from apps.inventory.models import Supplier, Location, Product
from apps.accounts.models import AppUser


class PurchaseOrder(models.Model):
    """
    Purchase order header: purchase_order
    """
    po_id = models.BigAutoField(primary_key=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.DO_NOTHING, db_column="supplier_id"
    )
    location = models.ForeignKey(
        Location, on_delete=models.DO_NOTHING, db_column="location_id"
    )  # receive location
    order_date = models.DateField()
    expected_date = models.DateField(blank=True, null=True)
    # ENUM('DRAFT','APPROVED','PARTIALLY_RECEIVED','CLOSED','CANCELLED')
    status = models.CharField(max_length=20, default="DRAFT")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_by = models.ForeignKey(
        AppUser, on_delete=models.DO_NOTHING, db_column="created_by"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "purchase_order"

    def __str__(self):
        return f"PO #{self.po_id} - {self.supplier.name}"


class SalesOrder(models.Model):
    """
    Sales order header: sales_order
    """
    so_id = models.BigAutoField(primary_key=True)
    location = models.ForeignKey(
        Location, on_delete=models.DO_NOTHING, db_column="location_id"
    )  # store location
    order_date = models.DateField()
    customer_name = models.CharField(max_length=150, blank=True, null=True)
    status = models.CharField(max_length=20, default="DRAFT") # ENUM('DRAFT','CONFIRMED','PARTIALLY_SHIPPED','CLOSED','CANCELLED')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_by = models.ForeignKey(
        AppUser, on_delete=models.DO_NOTHING, db_column="created_by"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "sales_order"

    def __str__(self):
        return f"SO #{self.so_id} - {self.customer_name or 'Walk-in'}"


class PurchaseOrderItem(models.Model):
    """
    PO detail line: purchase_order_item

    Note: The real PK in DB is (po_id, product_id).
    Here I model approximately:
    - use `po` as primary_key to avoid Django creating `id` column
    - unique_together ensures (po, product) is unique
    Mainly used for reading data, the add/edit operations will be handled more carefully later.
    """
    po = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.DO_NOTHING,
        db_column="po_id",
        primary_key=True,
    )
    product = models.ForeignKey(
        Product, on_delete=models.DO_NOTHING, db_column="product_id"
    )
    ordered_qty = models.IntegerField()
    received_qty = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        managed = False
        db_table = "purchase_order_item"
        unique_together = (("po", "product"),)

    def __str__(self):
        return f"PO #{self.po_id} - {self.product.name} x {self.ordered_qty}"


class SalesOrderItem(models.Model):
    """
    SO detail line: sales_order_item

    The actual PK is (so_id, product_id) → same as above, use `so` as primary_key.
    """
    so = models.ForeignKey(
        SalesOrder,
        on_delete=models.DO_NOTHING,
        db_column="so_id",
        primary_key=True,
    )
    product = models.ForeignKey(
        Product, on_delete=models.DO_NOTHING, db_column="product_id"
    )
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=5, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        managed = False
        db_table = "sales_order_item"
        unique_together = (("so", "product"),)

    def __str__(self):
        return f"SO #{self.so_id} - {self.product.name} x {self.quantity}"
