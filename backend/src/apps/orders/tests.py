# backend/src/apps/orders/tests.py
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import AppUser, Role
from apps.inventory.models import (
    Category,
    Product,
    Supplier,
    Location,
    InventoryLevel,
)
from apps.orders.models import SalesOrder, SalesOrderItem


class BaseApiTestCase(TestCase):
    """
    Base class for API tests:
    - Creates a staff user and authenticates APIClient.
    """

    def setUp(self):
        self.client = APIClient()

        self.role = Role.objects.create(
            role_name="MANAGER",
            description="Test manager",
        )
        self.user = AppUser.objects.create(
            username="test_manager",
            password_hash="dummy",
            full_name="Test Manager",
            email="manager@example.com",
            role=self.role,
            status="ACTIVE",
        )
        # DRF will bypass JWT and treat this as authenticated user
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(name="Test Category")
        self.supplier = Supplier.objects.create(
            name="Test Supplier",
            status="ACTIVE",
        )
        self.location = Location.objects.create(
            name="Main Warehouse",
            type="WAREHOUSE",
            status="ACTIVE",
        )
        self.product = Product.objects.create(
            category=self.category,
            name="Test Product",
            sku="TP-001",
            unit_price=100000,
            reorder_level=5,
            status="ACTIVE",
        )

        # initial stock
        InventoryLevel.objects.create(
            product=self.product,
            location=self.location,
            quantity_on_hand=10,
        )


class SalesOrderConfirmTests(BaseApiTestCase):
    """
    Check sp_confirm_sales_order + triggers via API.
    """

    def _create_draft_sales_order(self, quantity):
        so = SalesOrder.objects.create(
            customer_name="Test Customer",
            location=self.location,
            order_date="2024-01-01",
            status="DRAFT",
            created_by=self.user,
        )
        SalesOrderItem.objects.create(
            so=so,
            product=self.product,
            quantity=quantity,
            unit_price=self.product.unit_price,
            discount=0,
            line_total=quantity * self.product.unit_price,
        )
        return so

    def test_confirm_sales_order_with_enough_stock(self):
        """
        Confirming SO when there is enough stock should succeed
        and reduce inventory_level.
        """
        so = self._create_draft_sales_order(quantity=3)

        resp = self.client.post(f"/api/sales-orders/{so.so_id}/confirm/")
        self.assertEqual(resp.status_code, 200)

        so.refresh_from_db()
        self.assertEqual(so.status, "CONFIRMED")

        il = InventoryLevel.objects.get(
            product=self.product, location=self.location
        )
        self.assertEqual(il.quantity_on_hand, 7)  # 10 - 3

    def test_confirm_sales_order_without_enough_stock(self):
        """
        When stock is not enough, database trigger should block and
        API returns 400 with an error message.
        """
        so = self._create_draft_sales_order(quantity=999)

        resp = self.client.post(f"/api/sales-orders/{so.so_id}/confirm/")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Not enough stock", resp.data.get("detail", ""))

        # status unchanged
        so.refresh_from_db()
        self.assertEqual(so.status, "DRAFT")
