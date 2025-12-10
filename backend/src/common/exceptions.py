# backend/src/common/exceptions.py
"""
common.exceptions
=================

Define shared application exceptions and a custom DRF exception handler
to map database/business errors to clear HTTP responses.
"""

from __future__ import annotations

from typing import Any, Dict

from django.db import DatabaseError, IntegrityError
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status


class AppError(Exception):
    """Base class for application-level errors."""
    default_detail = "Application error."
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, detail: str | None = None, code: int | None = None):
        super().__init__(detail or self.default_detail)
        self.detail = detail or self.default_detail
        self.code = code


class BusinessLogicError(AppError):
    """Business rule error (e.g., insufficient stock, invalid state, etc.)."""
    default_detail = "Business logic error."


class DatabaseConflictError(AppError):
    """Data conflict (unique constraint violations, FK issues, etc.)."""
    default_detail = "Database conflict."
    status_code = status.HTTP_409_CONFLICT


def custom_exception_handler(exc: Exception, context: Dict[str, Any]) -> Response | None:
    """
    Custom exception handler for DRF.

    To enable it, configure in settings:

        REST_FRAMEWORK = {
            "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
            ...
        }
    """
    # 1) Our custom AppError subclasses -> map directly to HTTP response
    if isinstance(exc, AppError):
        data = {"detail": exc.detail}
        if exc.code is not None:
            data["code"] = exc.code
        return Response(data, status=exc.status_code)

    # 2) Common database errors
    if isinstance(exc, IntegrityError):
        msg = "Data is not valid (database constraint violated)."
        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, DatabaseError):
        msg = "Unexpected database error."
        return Response({"detail": msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 3) Fallback: use DRF's default handler
    response = drf_exception_handler(exc, context)
    return response
