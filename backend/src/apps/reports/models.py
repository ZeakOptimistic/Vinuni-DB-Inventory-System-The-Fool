# backend/src/apps/reports/models.py
"""
Reporting app does not define Django models.

All report data is read from MySQL views using helper functions in
`common.db` (query_view, etc.). This file exists only to keep the app
structure consistent.
"""
