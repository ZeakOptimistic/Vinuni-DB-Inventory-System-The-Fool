FROM python:3.11-slim

# System deps for mysqlclient (if requirements use mysqlclient)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential default-libmysqlclient-dev pkg-config \
    netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements to cache firstly
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy source (optional, because docker-compose has already mounted code)
COPY src /app/src

EXPOSE 8000