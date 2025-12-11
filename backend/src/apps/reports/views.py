# backend/src/apps/reports/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework.permissions import IsAuthenticated

from apps.inventory.models import Product
from common.db import query_view


class InventoryOverviewView(APIView):
    """
    Dashboard cards: total products, total stock value, low-stock count.

    GET /api/reports/overview/
    Response example:
    {
        "total_products": 10,
        "total_stock_value": 1234567,
        "low_stock_count": 3
    }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Total number of active products
        total_products = Product.objects.count()

        # Use DB view to compute stock value per (product, location)
        stock_rows = query_view("view_stock_per_location")
        total_stock_value = 0
        for row in stock_rows:
            # Defensive: handle None if column is missing
            value = row.get("stock_value") or 0
            try:
                total_stock_value += float(value)
            except (TypeError, ValueError):
                # If value is not numeric for some reason, just ignore that row
                continue

        # Low-stock products (based on DB view)
        low_stock_rows = query_view("view_low_stock_products")
        low_stock_count = len(low_stock_rows)

        data = {
            "total_products": total_products,
            "total_stock_value": int(total_stock_value),
            "low_stock_count": low_stock_count,
        }
        return Response(data, status=status.HTTP_200_OK)


class LowStockReportView(APIView):
    """
    List of low-stock products for dashboard + reports page.

    GET /api/reports/low-stock/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = query_view("view_low_stock_products")
        # Just return the rows as-is; keys come from the SQL view definition
        return Response(rows, status=status.HTTP_200_OK)


class TopSellingReportView(APIView):
    """
    Top selling products (e.g. last 30 days) for dashboard chart.

    GET /api/reports/top-selling/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = query_view("view_top_selling_products_last_30_days")
        return Response(rows, status=status.HTTP_200_OK)


class StockPerLocationView(APIView):
    """
    Stock snapshot per (product, location).

    GET /api/reports/stock-per-location/
    Optional query params:
      - location_id: filter results by location_id (integer)

    We load all rows from the DB view and filter in Python. This keeps the
    helper usage simple and avoids hand-writing SQL in the view layer.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = query_view("view_stock_per_location")

        location_id = request.query_params.get("location_id")
        if location_id is not None:
            try:
                target_id = int(location_id)
                rows = [
                    row
                    for row in rows
                    if row.get("location_id") == target_id
                ]
            except ValueError:
                # Invalid location_id → ignore filter and return full list
                pass

        return Response(rows, status=status.HTTP_200_OK)
