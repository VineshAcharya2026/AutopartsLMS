#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/database
npx prisma migrate deploy

echo "Seeding default users (safe upsert)..."
python seed.py || true

echo "Starting API on port ${PORT:-8000}..."
cd /app/apps/api
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
