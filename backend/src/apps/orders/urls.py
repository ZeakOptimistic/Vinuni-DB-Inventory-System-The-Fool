# backend/src/apps/orders/urls.py
from django.urls import path

from .views import (
    SalesOrderListCreateView,
    PurchaseOrderListCreateView,
    PurchaseOrderReceiveAllView,
    TransferStockView,
)

urlpatterns = [
    path(
        "sales-orders/",
        SalesOrderListCreateView.as_view(),
        name="sales-order-list-create",
    ),
    path(
        "purchase-orders/",
        PurchaseOrderListCreateView.as_view(),
        name="purchase-order-list-create",
    ),
    path(
        "purchase-orders/<int:po_id>/receive-all/",
        PurchaseOrderReceiveAllView.as_view(),
        name="purchase-order-receive-all",
    ),
    path(
        "transfers/",
        TransferStockView.as_view(),
        name="transfer-stock"
    ),
]
