#!/bin/sh
# Start API immediately for Render /health; migrate + seed in background.

normalize_db_url() {
  url="$1"
  if [ -z "$url" ] || echo "$url" | grep -q 'sslmode='; then
    printf '%s' "$url"
    return
  fi
  case "$url" in
    *render.com*|*dpg-*)
      if echo "$url" | grep -q '?'; then
        printf '%s' "${url}&sslmode=require"
      else
        printf '%s' "${url}?sslmode=require"
      fi
      ;;
    *)
      printf '%s' "$url"
      ;;
  esac
}

export DATABASE_URL="$(normalize_db_url "$DATABASE_URL")"

(
  sleep 2
  echo "Running database migrations..."
  cd /app/packages/database || exit 0
  npx prisma migrate deploy || echo "WARN: prisma migrate deploy failed"

  if [ "${RUN_SEED:-1}" != "0" ]; then
    echo "Seeding default users..."
    python seed.py || echo "WARN: seed skipped"
  fi
) &

echo "Starting API on port ${PORT:-8000}..."
cd /app/apps/api
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
