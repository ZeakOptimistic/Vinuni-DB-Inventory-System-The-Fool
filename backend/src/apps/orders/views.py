# backend/src/apps/orders/views.py
from django.db import DatabaseError, transaction
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from collections import defaultdict
from apps.inventory.models import InventoryLevel

from .serializers import (
    SalesOrderCreateSerializer,
    SalesOrderSerializer,
    PurchaseOrderCreateSerializer,
    PurchaseOrderSerializer,
    TransferStockSerializer,
)
from .models import SalesOrder, PurchaseOrder, PurchaseOrderItem
from apps.accounts.permissions import IsManagerOrAdmin
from apps.inventory.models import (
    Product,
    Location,
    InventoryLevel,
    StockMovement,
)


class SalesOrderListCreateView(APIView):
    """
    Sales Orders

    - GET  /api/sales-orders/      → list last 50 sales orders.
    - POST /api/sales-orders/      → create + confirm (call stored procedure).

    All authenticated roles (ADMIN / MANAGER / CLERK) can create sales orders.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = request.query_params.get("limit", 5000)
        try:
            limit = min(max(int(limit), 1), 5000)
        except Exception:
            limit = 5000

        orders = SalesOrder.objects.all().order_by("-created_at")[:limit]
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
            # Catch errors caused by stored procedure SIGNAL
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = SalesOrderSerializer(so).data
        return Response(output, status=status.HTTP_201_CREATED)

class SalesOrderCancelView(APIView):
    """
    Cancel a sales order.

    POST /api/sales-orders/<so_id>/cancel/

    Only ADMIN / MANAGER can cancel sales orders.
    """
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, so_id):
        try:
            so = SalesOrder.objects.get(pk=so_id)
        except SalesOrder.DoesNotExist:
            return Response(
                {"detail": "Sales order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Basic rule: only CONFIRMED orders can be cancelled
        if so.status in ["CANCELLED", "CLOSED"]:
            return Response(
                {"detail": f"Cannot cancel sales order in status '{so.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if so.status != "CONFIRMED":
            return Response(
                {"detail": "Only CONFIRMED sales orders can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Simple implementation: just mark as CANCELLED
        so.status = "CANCELLED"
        so.save(update_fields=["status"])

        data = SalesOrderSerializer(so).data
        return Response(data, status=status.HTTP_200_OK)


class PurchaseOrderListCreateView(APIView):
    """
    Purchase Orders

    - GET  /api/purchase-orders/   → list last 50 purchase orders (all roles).
    - POST /api/purchase-orders/   → create purchase order + items.

    Only ADMIN / MANAGER can create purchase orders.
    """

    def get_permissions(self):
        """
        GET: any authenticated user.
        POST: ADMIN or MANAGER only.
        """
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsManagerOrAdmin()]

    def get(self, request):
        limit = request.query_params.get("limit", 5000)
        try:
            limit = min(max(int(limit), 1), 5000)
        except Exception:
            limit = 5000

        orders = PurchaseOrder.objects.all().order_by("-created_at")[:limit]
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

    - Compute remaining quantity for each PO line.
    - Insert stock movements with movement_type = 'PURCHASE_RECEIPT'.
    - MySQL trigger updates inventory_level automatically.
    - If all items fully received → close PO.

    Only ADMIN / MANAGER are allowed to execute this action.
    """
    permission_classes = [IsManagerOrAdmin]

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

        # Get items
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
            remaining = (item.ordered_qty or 0) - (item.received_qty or 0)
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
            # Nothing to receive, but still sync status (maybe old data had wrong status)
            all_items = PurchaseOrderItem.objects.filter(po=po)
            all_received = all(
                (item.received_qty or 0) >= (item.ordered_qty or 0)
                for item in all_items
            )
            po.status = "CLOSED" if all_received else "PARTIALLY_RECEIVED"
            po.save(update_fields=["status"])

            po.refresh_from_db()
            data = PurchaseOrderSerializer(po).data
            return Response(data, status=status.HTTP_200_OK)

        with transaction.atomic():
            # 1) Record stock movements
            StockMovement.objects.bulk_create(movements)

            # 2) Update received_qty for PO lines
            for it in items_to_update:
                PurchaseOrderItem.objects.filter(po=po, product_id=it.product_id).update(
                    received_qty=it.received_qty
                )


            # 3) Update the Purchase Order status after receiving the goods.
            all_items = PurchaseOrderItem.objects.filter(po=po)

            # Check if all lines have been received.
            all_received = all(
                (item.received_qty or 0) >= (item.ordered_qty or 0)
                for item in all_items
            )

            if all_received:
                # Received everything → CLOSED
                po.status = "CLOSED"
            else:
            # If there is a partial receiving flow later (not receive-all),
            # then receiving a part will result in the state PARTIALLY_RECEIVED.
            # With the current logic (receive-all), this branch may not be used much,
            # but it will be prepared for future business flows.
                po.status = "PARTIALLY_RECEIVED"

            po.save(update_fields=["status"])

        po.refresh_from_db()
        data = PurchaseOrderSerializer(po).data
        return Response(data, status=status.HTTP_200_OK)


class TransferStockView(APIView):
    """
    POST /api/transfers/

    Request body:
    {
        "product_id": 1,
        "from_location_id": 1,
        "to_location_id": 2,
        "quantity": 5
    }

    - Quantity must be > 0 (enforced by MySQL trigger).
    - Trigger on stock_movement will update inventory_level and
      prevent negative inventory.

    Only ADMIN / MANAGER can perform stock transfers.
    """
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsManagerOrAdmin()]

    def post(self, request):
        serializer = TransferStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        qty = data["quantity"]

        if data["from_location_id"] == data["to_location_id"]:
            raise ValidationError({"to_location_id": "Destination must be different from source location."})

        # Determine user id for created_by
        user = request.user
        user_pk = getattr(user, "user_id", getattr(user, "pk", None))
        if user_pk is None:
            return Response(
                {"detail": "Invalid user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Lock product & locations
                try:
                    product = (
                        Product.objects.select_for_update()
                        .select_related("category")
                        .get(
                            product_id=data["product_id"],
                            status="ACTIVE",
                            category__status="ACTIVE",
                        )
                    )
                except Product.DoesNotExist:
                    raise ValidationError({"product_id": "Product not available (inactive product/category) or not found."})

                try:
                    from_location = Location.objects.select_for_update().get(
                        location_id=data["from_location_id"],
                        status="ACTIVE",
                    )
                except Location.DoesNotExist:
                    raise ValidationError(
                        {"from_location_id": "Source location not available (inactive) or not found."}
                    )

                try:
                    to_location = Location.objects.select_for_update().get(
                        location_id=data["to_location_id"],
                        status="ACTIVE",
                    )
                except Location.DoesNotExist:
                    raise ValidationError(
                        {"to_location_id": "Destination location not available (inactive) or not found."}
                    )

                # Optional pre-check: current stock at source
                from_il = (
                    InventoryLevel.objects.select_for_update()
                    .filter(product=product, location=from_location)
                    .first()
                )
                current_qty = from_il.quantity_on_hand if from_il else 0
                if current_qty < qty:
                    raise ValidationError(
                        {"quantity": "Not enough stock in source location."}
                    )

                # Insert stock movements (quantity > 0 !)
                out_mv = StockMovement.objects.create(
                    product=product,
                    location=from_location,
                    quantity=qty,
                    movement_type="TRANSFER_OUT",
                    related_document_type="TRANSFER",
                    related_document_id=None,  # update after we know id
                    created_by_id=user_pk,
                )

                transfer_id = out_mv.movement_id
                out_mv.related_document_id = transfer_id
                out_mv.save(update_fields=["related_document_id"])

                StockMovement.objects.create(
                    product=product,
                    location=to_location,
                    quantity=qty,
                    movement_type="TRANSFER_IN",
                    related_document_type="TRANSFER",
                    related_document_id=transfer_id,
                    created_by_id=user_pk,
                )

                # Read updated inventory after trigger
                from_il_after = (
                    InventoryLevel.objects.select_for_update()
                    .filter(product=product, location=from_location)
                    .first()
                )
                to_il_after = (
                    InventoryLevel.objects.select_for_update()
                    .filter(product=product, location=to_location)
                    .first()
                )

                from_qty_after = from_il_after.quantity_on_hand if from_il_after else 0
                to_qty_after = to_il_after.quantity_on_hand if to_il_after else 0

        except ValidationError:
            # let DRF handle and return 400
            raise
        except DatabaseError as e:
            # MySQL SIGNAL from trigger (quantity <= 0, inventory negative, etc.)
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Final response for frontend
        return Response(
            {
                "transfer_id": transfer_id,
                "product_id": product.product_id,
                "product_name": getattr(product, "name", None),
                "from_location_id": from_location.location_id,
                "from_location_name": getattr(from_location, "name", None),
                "to_location_id": to_location.location_id,
                "to_location_name": getattr(to_location, "name", None),
                "quantity": qty,
                "from_quantity_on_hand": from_qty_after,
                "to_quantity_on_hand": to_qty_after,
            },
            status=status.HTTP_201_CREATED,
        )

    def get(self, request):
        limit = request.query_params.get("limit", 5000)
        try:
            limit = min(max(int(limit), 1), 5000)
        except Exception:
            limit = 5000

        # 1) get TRANSFER_OUT (main history)
        out_rows = list(
            StockMovement.objects.select_related("product", "location")
            .filter(
                movement_type="TRANSFER_OUT",
                related_document_type="TRANSFER",
            )
            .order_by("-created_at")[:limit]
        )

        # 2) map to TRANSFER_IN
        # prioritize matching by out_mv.movement_id (new standard), fallback to related_document_id (old data)
        key_ids = set()
        for r in out_rows:
            key_ids.add(r.movement_id)
            if r.related_document_id:
                key_ids.add(r.related_document_id)

        in_rows = list(
            StockMovement.objects.select_related("location")
            .filter(
                movement_type="TRANSFER_IN",
                related_document_type="TRANSFER",
                related_document_id__in=list(key_ids),
            )
        )
        in_map = {r.related_document_id: r for r in in_rows}

        # 3) prepare set of (product, location) to compute historical qty_after
        pairs = set()
        for out_mv in out_rows:
            pairs.add((out_mv.product_id, out_mv.location_id))
            in_mv = in_map.get(out_mv.movement_id) or in_map.get(out_mv.related_document_id)
            if in_mv:
                pairs.add((in_mv.product_id, in_mv.location_id))

        product_ids = {p for (p, _) in pairs}
        location_ids = {l for (_, l) in pairs}

        # current qty snapshot
        il_rows = InventoryLevel.objects.filter(
            product_id__in=product_ids,
            location_id__in=location_ids,
        )
        current_qty = {(il.product_id, il.location_id): il.quantity_on_hand for il in il_rows}

        # find earliest movement_date in out_rows
        if out_rows:
            earliest_dt = min(r.movement_date for r in out_rows)
        else:
            earliest_dt = timezone.now()

        # 4) in order to compute historical qty_after
        move_rows = list(
            StockMovement.objects.filter(
                product_id__in=product_ids,
                location_id__in=location_ids,
                movement_date__gte=earliest_dt,
                movement_type__in=[
                    "PURCHASE_RECEIPT",
                    "SALES_ISSUE",
                    "ADJUSTMENT",
                    "TRANSFER_OUT",
                    "TRANSFER_IN",
                ],
            ).order_by("-movement_date", "-movement_id")
        )

        def delta(mv):
            q = mv.quantity or 0
            if mv.movement_type in ("PURCHASE_RECEIPT", "TRANSFER_IN", "ADJUSTMENT"):
                return q
            if mv.movement_type in ("SALES_ISSUE", "TRANSFER_OUT"):
                return -q
            return 0

        future_sum = defaultdict(int)
        qty_after_by_movement_id = {}

        for mv in move_rows:
            k = (mv.product_id, mv.location_id)
            now_qty = current_qty.get(k, 0)
            qty_after_by_movement_id[mv.movement_id] = now_qty - future_sum[k]
            future_sum[k] += delta(mv)

        # 5) return data
        data = []
        for out_mv in out_rows:
            in_mv = in_map.get(out_mv.movement_id) or in_map.get(out_mv.related_document_id)

            data.append(
                {
                    # IMPORTANT: show real unique id of the transfer
                    "transfer_id": out_mv.movement_id,

                    "product_id": out_mv.product_id,
                    "product_name": getattr(out_mv.product, "name", None),

                    "from_location_id": out_mv.location_id,
                    "from_location_name": getattr(out_mv.location, "name", None),

                    "to_location_id": getattr(in_mv, "location_id", None),
                    "to_location_name": getattr(getattr(in_mv, "location", None), "name", None),

                    "quantity": out_mv.quantity,
                    "created_at": out_mv.created_at,

                    # historical qty after (after the movement)
                    "from_qty_after": qty_after_by_movement_id.get(out_mv.movement_id),
                    "to_qty_after": qty_after_by_movement_id.get(getattr(in_mv, "movement_id", None)),
                }
            )

        return Response(data, status=status.HTTP_200_OK)
