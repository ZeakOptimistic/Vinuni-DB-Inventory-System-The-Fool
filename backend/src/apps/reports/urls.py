# backend/src/apps/reports/urls.py
from django.urls import path
from .views import (
    InventoryOverviewView,
    LowStockReportView,
    TopSellingReportView,
    StockPerLocationView,
)

urlpatterns = [
    path("overview/", InventoryOverviewView.as_view(), name="report-overview"),
    path("low-stock/", LowStockReportView.as_view(), name="report-low-stock"),
    path("top-selling/", TopSellingReportView.as_view(), name="report-top-selling"),
    path(
        "stock-per-location/",
        StockPerLocationView.as_view(),
        name="report-stock-per-location",
    ),
]
