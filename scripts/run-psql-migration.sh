#!/usr/bin/env bash
set -euo pipefail

# Load env vars safely from .env.local
if [ -f ".env.local" ]; then
  set -a
  . ./.env.local
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set. Ensure .env.local contains DATABASE_URL"
  exit 1
fi

SQL_FILE="${1:-scripts/migrations/003_webmaster_schema_alignment_fix.sql}"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  echo "Usage: $0 <path-to-sql-file>"
  exit 1
fi

echo "🚀 Running migration via psql: $SQL_FILE"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "✅ Migration completed"
