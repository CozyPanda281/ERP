#!/usr/bin/env bash
# Apply database migrations in order. Uses DATABASE_URL, or local dev defaults.
# Idempotent: every migration is written to be safe to re-run.
set -euo pipefail

MIGRATIONS_DIR="$(cd "$(dirname "$0")/../backend/db/migrations" && pwd)"
BASE_SCHEMA="$(cd "$(dirname "$0")/../database" && pwd)/001_schema.sql"
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/erp}"
ERP_APP_PASSWORD="${ERPPWD:-}"

apply() {
  if [ -n "$ERP_APP_PASSWORD" ]; then
    psql "$DB_URL" -v ON_ERROR_STOP=1 -v erp_app_password="$ERP_APP_PASSWORD" -f "$1"
  else
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$1"
  fi
}

# Bootstrap the base schema only on a fresh database (001_schema.sql is not
# idempotent — plain CREATE TABLE).
if psql "$DB_URL" -tAc "SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='tenants'" | grep -q 1; then
  echo "==> base schema present, skipping 001_schema.sql"
else
  echo "==> 001_schema.sql (base schema)"
  apply "$BASE_SCHEMA"
fi

for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "==> $(basename "$f")"
  apply "$f"
done

echo "Migrations complete."
