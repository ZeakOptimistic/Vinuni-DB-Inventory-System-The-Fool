# backend/src/apps/reports/serializers.py
"""
Serializers for reporting endpoints.

Currently the reporting views return raw dictionaries from SQL views,
so these serializers are not strictly required. They are kept here as
placeholders in case we want to enforce a strict schema later.
"""

from rest_framework import serializers


class InventoryOverviewSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_stock_value = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
