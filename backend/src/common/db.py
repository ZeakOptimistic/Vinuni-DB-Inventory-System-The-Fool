# backend/src/common/db.py
"""
common.db
=========

Shared helpers for working with the database via Django's connection:

- execute_sql     : execute a single SQL statement (INSERT/UPDATE/DELETE)
- query_sql       : run SELECT and return list of dicts/tuples
- fetch_one_value : convenience helper for `SELECT ... LIMIT 1`
- call_procedure  : call stored procedures (sp_...) and optionally get results
"""

from __future__ import annotations

from typing import Any, Iterable, List, Dict, Optional

from django.db import connection


def _dictfetchall(cursor) -> List[Dict[str, Any]]:
    """
    Convert cursor.fetchall() to list[dict], where keys are column names.
    """
    columns = [col[0] for col in cursor.description] if cursor.description else []
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def execute_sql(sql: str, params: Optional[Iterable[Any]] = None) -> int:
    """
    Execute a single SQL statement that does not return rows
    (INSERT, UPDATE, DELETE, DDL, etc.).

    Returns:
        int: number of affected rows.
    """
    with connection.cursor() as cursor:
        rowcount = cursor.execute(sql, params or [])
    return rowcount


def query_sql(
    sql: str,
    params: Optional[Iterable[Any]] = None,
    as_dict: bool = True,
) -> List[Any]:
    """
    Run a SELECT statement and return all rows.

    Args:
        sql: SQL query string.
        params: parameters for the query.
        as_dict: if True, return list[dict]; otherwise list[tuple].

    Returns:
        List of rows.
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        if cursor.description is None:
            return []
        if as_dict:
            return _dictfetchall(cursor)
        return list(cursor.fetchall())


def fetch_one_value(
    sql: str,
    params: Optional[Iterable[Any]] = None,
    default: Any = None,
) -> Any:
    """
    Run SELECT ... LIMIT 1 and return the first column of the first row.

    If no rows are returned, return `default`.
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        row = cursor.fetchone()
        if not row:
            return default
        return row[0]


def call_procedure(
    name: str,
    params: Optional[Iterable[Any]] = None,
    as_dict: bool = True,
) -> List[Any]:
    """
    Call a stored procedure in the database.

    Example:
        call_procedure("sp_confirm_sales_order", [1, 2])

    Note:
        - The current procedures (sp_create_purchase_order, sp_confirm_sales_order, etc.)
          mostly perform data modifications and do not always return a result set.
        - If a result set is returned, this helper will read and return it.
    """
    with connection.cursor() as cursor:
        cursor.callproc(name, params or [])
        if cursor.description is None:
            return []
        if as_dict:
            return _dictfetchall(cursor)
        return list(cursor.fetchall())


def query_view(
    view_name: str,
    where_clause: str = "",
    params: Optional[Iterable[Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Convenience helper for reading from a VIEW.

    Example:
        query_view("view_stock_per_location", "WHERE location_id = %s", [1])
    """
    sql = f"SELECT * FROM {view_name} "
    if where_clause:
        # where_clause should be a safe string, not raw user input concatenated directly.
        sql += " " + where_clause.strip()
    return query_sql(sql, params or [])
