# backend/src/apps/inventory/models.py
from django.db import models
from django.utils import timezone


class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "category"

    def __str__(self):
        return self.name


class Supplier(models.Model):
    supplier_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    contact_name = models.CharField(max_length=150, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    email = models.CharField(max_length=150, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=8)  # 'ACTIVE' / 'INACTIVE'
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "supplier"

    def __str__(self):
        return self.name


class Location(models.Model):
    location_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    type = models.CharField(max_length=10)  # 'WAREHOUSE' / 'STORE'
    address = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=8)  # 'ACTIVE' / 'INACTIVE'
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "location"

    def __str__(self):
        return f"{self.name} ({self.type})"


class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    category = models.ForeignKey(Category, on_delete=models.DO_NOTHING)
    name = models.CharField(max_length=150)
    sku = models.CharField(max_length=50, unique=True)
    barcode = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    unit_of_measure = models.CharField(max_length=20)
    reorder_level = models.PositiveIntegerField()
    status = models.CharField(max_length=8)  # 'ACTIVE' / 'INACTIVE'
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "product"

    def __str__(self):
        return f"{self.name} ({self.sku})"


class InventoryLevel(models.Model):
    # The real PK is (product_id, location_id); approximate modeling:
    product = models.ForeignKey(
        Product, on_delete=models.DO_NOTHING, db_column="product_id", primary_key=True
    )
    location = models.ForeignKey(
        Location, on_delete=models.DO_NOTHING, db_column="location_id"
    )
    quantity_on_hand = models.IntegerField()
    last_updated = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "inventory_level"
        unique_together = (("product", "location"),)

    def __str__(self):
        return f"{self.product} @ {self.location} : {self.quantity_on_hand}"


class StockMovement(models.Model):
    movement_id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product, on_delete=models.DO_NOTHING, db_column="product_id"
    )
    location = models.ForeignKey(
        Location, on_delete=models.DO_NOTHING, db_column="location_id"
    )
    quantity = models.IntegerField()  # >0 in, <0 out
    movement_type = models.CharField(max_length=20)
    related_document_type = models.CharField(
        max_length=20, blank=True, null=True
    )  # 'PURCHASE_ORDER', 'SALES_ORDER',...
    related_document_id = models.BigIntegerField(blank=True, null=True)
    movement_date = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        "accounts.AppUser", on_delete=models.DO_NOTHING, db_column="created_by"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "stock_movement"

    def __str__(self):
        return f"{self.movement_type} {self.quantity} of {self.product} @ {self.location}"
