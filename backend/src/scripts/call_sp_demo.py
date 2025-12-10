# backend/src/scripts/call_sp_demo.py
"""
scripts.call_sp_demo
====================

Small helper script to manually call a stored procedure from the CLI.

Usage:
    cd backend/src
    python -m scripts.call_sp_demo sp_confirm_sales_order 1 2

This will execute:

    CALL sp_confirm_sales_order(1, 2);
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from decimal import Decimal

import django
from django.db import connection

# ----- Django setup -----
BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend/src
sys.path.append(str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()


def _convert_arg(value: str):
    """
    Try to convert a CLI argument to int/Decimal where appropriate.
    Fallback to raw string if conversion fails.
    """
    try:
        return int(value)
    except ValueError:
        pass

    try:
        return Decimal(value)
    except ValueError:
        pass

    return value


def call_procedure_cli(proc_name: str, args: list[str]) -> None:
    params = [_convert_arg(v) for v in args]
    print(f"Calling {proc_name}({', '.join(map(str, params))}) ...")

    with connection.cursor() as cursor:
        cursor.callproc(proc_name, params)
        if cursor.description:
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            print("Result set:")
            print(" | ".join(columns))
            for row in rows:
                print(" | ".join(str(v) for v in row))
        else:
            print("Procedure executed successfully (no result set).")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.call_sp_demo <proc_name> [param1 param2 ...]")
        sys.exit(1)

    proc_name = sys.argv[1]
    proc_args = sys.argv[2:]
    call_procedure_cli(proc_name, proc_args)
