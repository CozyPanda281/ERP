#!/usr/bin/env bash
# Apply database migrations in order. Uses DATABASE_URL, or local dev defaults.
# Idempotent: every migration is written to be safe to re-run.
set -euo pipefail

MIGRATIONS_DIR="$(cd "$(dirname "$0")/../backend/db/migrations" && pwd)"
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/erp}"
ERP_APP_PASSWORD="${ERPPWD:-}"

for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "==> $(basename "$f")"
  if [ -n "$ERP_APP_PASSWORD" ]; then
    psql "$DB_URL" -v ON_ERROR_STOP=1 -v erp_app_password="$ERP_APP_PASSWORD" -f "$f"
  else
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
  fi
done

echo "Migrations complete."
