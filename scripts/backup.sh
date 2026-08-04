#!/usr/bin/env bash
# Postgres backup with retention. Run daily from cron:
#   0 2 * * * /path/to/erp/scripts/backup.sh >> /var/log/erp-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
DATABASE_URL="${DATABASE_URL:?Set DATABASE_URL to run backups}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/erp-$STAMP.sql.gz"

pg_dump --no-owner --clean "$DATABASE_URL" | gzip > "$FILE"
find "$BACKUP_DIR" -name 'erp-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup written: $FILE (retention: ${RETENTION_DAYS}d)"
