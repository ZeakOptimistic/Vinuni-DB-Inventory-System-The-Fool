# backend/src/scripts/load_demo_data.py
"""
scripts.load_demo_data
======================

Execute the SQL in database/seed_data.sql using Django's DB connection.

Usage:
    cd backend/src
    python -m scripts.load_demo_data

Notes:
    - The seed_data.sql file is expected at: backend/database/seed_data.sql
    - This script is meant for dev/test environments only (it may delete/overwrite data).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import django
from django.db import connection

# ----- Django setup -----
SRC_DIR = Path(__file__).resolve().parents[1]   # .../backend/src
PROJECT_ROOT = SRC_DIR.parent                  # .../backend
sys.path.append(str(SRC_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

DATABASE_DIR = PROJECT_ROOT / "database"
SEED_FILE = DATABASE_DIR / "seed_data.sql"


def run_sql_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"SQL file not found: {path}")

    print(f"Loading SQL from {path} ...")

    with path.open("r", encoding="utf-8") as f:
        lines = f.readlines()

    statements = []
    current = []

    for line in lines:
        stripped = line.strip()

        # Skip comments and empty lines
        if not stripped or stripped.startswith("--"):
            continue

        current.append(line)

        # End of statement when we see ';' at the end of a line
        if stripped.endswith(";"):
            sql = "".join(current).rstrip().rstrip(";")
            statements.append(sql)
            current = []

    with connection.cursor() as cursor:
        for stmt in statements:
            if not stmt:
                continue
            print(f"Executing: {stmt[:80]}{'...' if len(stmt) > 80 else ''}")
            cursor.execute(stmt)

    print("Done seeding demo data.")


if __name__ == "__main__":
    try:
        run_sql_file(SEED_FILE)
    except Exception as e:
        print("Error while loading demo data:", e)
        sys.exit(1)
