#!/usr/bin/env sh
# Log & secret hygiene audit (Phase 1.6).
#
#   scripts/log-audit.sh                # static scan of tracked code
#   scripts/log-audit.sh /path/to/log   # also scan an application log file
#
# Fails (exit 1) if private keys, high-confidence secret formats, or PII
# patterns (Aadhaar / phone / email) are found. Wire this into CI.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

# --- Part A: static scan of tracked source for secret material ---------------
echo "== Part A: scanning tracked files for secret material =="
SECRET_PATTERNS='BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10,}|ghp_[0-9A-Za-z]{36,}|sk-[A-Za-z0-9]{20,}|-----BEGIN CERTIFICATE'
MATCHES="$(grep -rInE "$SECRET_PATTERNS" "$ROOT" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
  --exclude-dir=.next --exclude-dir=build \
  --exclude='*.map' --exclude='*.lock' --exclude='*package-lock.json' \
  --exclude-dir=coverage --exclude='log-audit.sh' \
  2>/dev/null || true)"
if [ -n "$MATCHES" ]; then
  echo "FOUND secret-like material:"
  echo "$MATCHES"
  FAILED=1
else
  echo "OK: no secret-like patterns in tracked code."
fi

# --- Part B (optional): scan a log file for PII ------------------------------
LOG_FILE="${1:-}"
if [ -n "$LOG_FILE" ] && [ -f "$LOG_FILE" ]; then
  echo "== Part B: scanning log file for PII =="
  # NOTE: no lookbehind/word boundaries — POSIX ERE (grep -E) doesn't support
  # them, and a bare lookbehind made grep error out so Part B always "passed".
  PII_PATTERNS='[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[6-9][0-9]{9}'
  HITS="$(grep -E "$PII_PATTERNS" "$LOG_FILE" | grep -v '"type":.*http.request' || true)"
  if [ -n "$HITS" ]; then
    echo "FOUND PII in log:"
    echo "$HITS"
    FAILED=1
  else
    echo "OK: no Aadhaar/phone/email patterns in log."
  fi
else
  echo "== Part B: skipped (no log file argument) =="
fi

if [ "$FAILED" -eq 0 ]; then
  echo "Audit passed."
else
  echo "Audit FAILED."
  exit 1
fi
