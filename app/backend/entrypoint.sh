#!/usr/bin/env bash
set -euo pipefail

DB_WAIT_RETRIES="${DB_WAIT_RETRIES:-30}"
DB_WAIT_DELAY="${DB_WAIT_DELAY:-1}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-1}"

# --- Wait for DB if it's Postgres ---
if [[ "${DATABASE_URL:-}" =~ ^postgres ]]; then
  echo "[entrypoint] Waiting for Postgres..."

  python - <<'PY'
import os, sys, time
from sqlalchemy import create_engine, text

url = os.environ.get("DATABASE_URL", "")
retries = int(os.environ.get("DB_WAIT_RETRIES", "30"))
delay = float(os.environ.get("DB_WAIT_DELAY", "1"))

engine = create_engine(url, pool_pre_ping=True, future=True)

for i in range(1, retries + 1):
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        print(f"[entrypoint] DB is reachable (attempt {i}/{retries})")
        sys.exit(0)
    except Exception:
        print(f"[entrypoint] DB not ready yet (attempt {i}/{retries}), retrying in {delay}s...")
        time.sleep(delay)

print(f"[entrypoint] ERROR: DB still unreachable after {retries} attempts")
sys.exit(1)
PY
fi

# --- Run migrations (optional) ---
if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  echo "[entrypoint] Running Alembic migrations..."
  alembic upgrade head
  echo "[entrypoint] Migrations complete"
else
  echo "[entrypoint] Skipping migrations (RUN_MIGRATIONS=$RUN_MIGRATIONS)"
fi

# --- Start app ---
echo "[entrypoint] Starting Uvicorn..."
exec python -m uvicorn src.main:app --host 0.0.0.0 --port 8080