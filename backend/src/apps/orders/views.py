# backend/src/apps/orders/views.py
from django.db import DatabaseError, transaction
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .serializers import (
    SalesOrderCreateSerializer,
    SalesOrderSerializer,
    PurchaseOrderCreateSerializer,
    PurchaseOrderSerializer,
)
from .models import SalesOrder, PurchaseOrder, PurchaseOrderItem
from apps.inventory.models import StockMovement


class SalesOrderListCreateView(APIView):
    """
    GET  /api/sales-orders/      → sales order list
    POST /api/sales-orders/      → create + confirm (call sp_confirm_sales_order)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = SalesOrder.objects.all().order_by("-created_at")[:50]
        serializer = SalesOrderSerializer(orders, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SalesOrderCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            so = serializer.save()
        except DatabaseError as e:
            # Catch errors caused by stored procedure SIGNAL (e.g. insufficient inventory)
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = SalesOrderSerializer(so).data
        return Response(output, status=status.HTTP_201_CREATED)


class PurchaseOrderListCreateView(APIView):
    """
    GET  /api/purchase-orders/   → list of imported goods
    POST /api/purchase-orders/   → Create PO + items (not received yet)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = PurchaseOrder.objects.all().order_by("-created_at")[:50]
        serializer = PurchaseOrderSerializer(orders, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PurchaseOrderCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        po = serializer.save()
        output = PurchaseOrderSerializer(po).data
        return Response(output, status=status.HTTP_201_CREATED)


class PurchaseOrderReceiveAllView(APIView):
    """
    POST /api/purchase-orders/<po_id>/receive-all/

    - Get all remaining quantity for each item in PO.
    - Create stock_movement with movement_type = 'PURCHASE_RECEIPT'
    - Trigger DB will update inventory_level automatically.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, po_id: int):
        # Get user_id to write to stock_movement.created_by
        user = request.user
        user_pk = getattr(user, "user_id", getattr(user, "pk", None))
        if user_pk is None:
            return Response(
                {"detail": "Invalid user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get PO
        try:
            po = PurchaseOrder.objects.select_related("location").get(pk=po_id)
        except PurchaseOrder.DoesNotExist:
            return Response(
                {"detail": "Purchase Order does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get item
        items = list(
            PurchaseOrderItem.objects.select_related("product").filter(po=po)
        )
        if not items:
            return Response(
                {"detail": "Purchase Order has no detail lines."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        movements = []
        items_to_update = []

        for item in items:
            remaining = item.ordered_qty - item.received_qty
            if remaining <= 0:
                continue

            # Prepare StockMovement for the remaining quantity
            movements.append(
                StockMovement(
                    product=item.product,
                    location=po.location,
                    quantity=remaining,
                    movement_type="PURCHASE_RECEIPT",
                    related_document_type="PURCHASE_ORDER",
                    related_document_id=po.po_id,
                    movement_date=now,
                    created_by_id=user_pk,
                    created_at=now,
                )
            )

            item.received_qty += remaining
            items_to_update.append(item)

        if not movements:
            return Response(
                {"detail": "All items in PO have been received in full."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # 1) Record stock_movement
            StockMovement.objects.bulk_create(movements)

            # 2) Update received_qty for PO lines
            PurchaseOrderItem.objects.bulk_update(items_to_update, ["received_qty"])

            # 3) If all PO items have been received → close PO
            all_items = PurchaseOrderItem.objects.filter(po=po)
            all_received = all(
                itm.ordered_qty == itm.received_qty for itm in all_items
            )
            if all_received:
                po.status = "CLOSED"
                po.save(update_fields=["status"])

        # Return to PO after receipt
        po.refresh_from_db()
        data = PurchaseOrderSerializer(po).data
        return Response(data, status=status.HTTP_200_OK)
