#!/bin/sh
# Start API immediately so Render /health checks pass, then migrate/seed in background.
set -e

export DATABASE_URL="${DATABASE_URL}"

cd /app/apps/api
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" &
UVICORN_PID=$!

(
  sleep 3
  echo "Running database migrations..."
  cd /app/packages/database
  npx prisma migrate deploy || echo "WARN: prisma migrate deploy failed (will retry on next deploy)"

  if [ "${RUN_SEED:-1}" != "0" ]; then
    echo "Seeding default users..."
    python seed.py || echo "WARN: seed skipped"
  fi
) &

trap 'kill "$UVICORN_PID" 2>/dev/null; wait "$UVICORN_PID" 2>/dev/null' INT TERM
wait "$UVICORN_PID"
