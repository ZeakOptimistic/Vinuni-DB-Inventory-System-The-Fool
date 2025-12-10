# backend/src/common/utils.py
"""
common.utils
============

Miscellaneous helpers (pagination, slug, safe parsing, etc.).
"""

from __future__ import annotations

from typing import Any, Dict, Tuple, Optional

from django.utils.text import slugify


def get_pagination_params(
    query_params: Dict[str, Any],
    default_page: int = 1,
    default_page_size: int = 20,
    max_page_size: int = 100,
) -> Tuple[int, int]:
    """
    Extract page and page_size from query params and clamp them
    to a reasonable range.

    Args:
        query_params: typically `request.query_params`.
    """
    def _to_int(value, default):
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    page = _to_int(query_params.get("page"), default_page)
    page_size = _to_int(query_params.get("page_size"), default_page_size)

    if page < 1:
        page = default_page
    if page_size < 1:
        page_size = default_page_size
    if page_size > max_page_size:
        page_size = max_page_size

    return page, page_size


def to_slug(value: str, allow_unicode: bool = True) -> str:
    """
    Convert an arbitrary string to a URL-friendly slug.

    Example:
        to_slug("Main Warehouse Hanoi") -> "main-warehouse-hanoi"
    """
    return slugify(value, allow_unicode=allow_unicode)


def parse_int(value: Optional[str], default: Optional[int] = None) -> Optional[int]:
    """
    Safely parse an integer from string.

    If parsing fails, return `default`.
    """
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
