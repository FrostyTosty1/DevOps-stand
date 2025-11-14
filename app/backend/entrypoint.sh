#!/usr/bin/env bash
set -euo pipefail

# --- Wait for DB if it's Postgres ---
# Skip if DATABASE_URL is SQLite
if [[ "${DATABASE_URL:-}" =~ ^postgres ]]; then
  echo "[entrypoint] Waiting for Postgres at ${DATABASE_URL}"
  # naive wait: try psql for up to ~30s
  for i in {1..30}; do
    if python - <<'PY'
import os, sys
from sqlalchemy import create_engine, text
url = os.environ.get("DATABASE_URL")
try:
    e = create_engine(url, pool_pre_ping=True, future=True)
    with e.connect() as c:
        c.execute(text("SELECT 1"))
    sys.exit(0)
except Exception as ex:
    sys.exit(1)
PY
    then
      echo "[entrypoint] DB is reachable"
      break
    else
      echo "[entrypoint] DB not ready yet, retrying..."
      sleep 1
    fi
  done
fi

# --- Run migrations ---
echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

# --- Start app ---
echo "[entrypoint] Starting Uvicorn..."
exec python -m uvicorn src.main:app --host 0.0.0.0 --port 8080
