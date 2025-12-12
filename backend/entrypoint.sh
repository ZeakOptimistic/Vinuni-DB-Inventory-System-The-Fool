#!/bin/sh
set -e

echo "Waiting for MySQL at $DB_HOST:$DB_PORT..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done

cd /app/src

# Django needs system tables
python manage.py migrate  # :contentReference[oaicite:7]{index=7}

# chạy dev server
python manage.py runserver 0.0.0.0:8000
