# ---------- Builder: build Python wheels (no compilers needed for our stack) ----------
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt /app/requirements.txt

# If your requirements include native extensions, you can install build tools:
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc \
#  && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip \
 && pip wheel --no-cache-dir -r /app/requirements.txt -w /wheels

# ---------- Runtime: minimal image + curl for debugging/healthchecks ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create non-root user
RUN useradd -m appuser

WORKDIR /app

# Install only what's needed at runtime
# - ca-certificates: TLS roots for HTTPS
# - curl: keep for debugging and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Install Python deps from prebuilt wheels
COPY requirements.txt /app/requirements.txt
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r /app/requirements.txt \
 && rm -rf /wheels

# App sources (no .env baked in)
COPY --chown=appuser:appuser src ./src
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser alembic.ini ./
COPY --chown=appuser:appuser --chmod=755 entrypoint.sh ./entrypoint.sh

# Expose API port
EXPOSE 8080

# Healthcheck using curl (hits /healthz)
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD sh -c "curl -fsS http://127.0.0.1:8080/healthz > /dev/null || exit 1"

USER appuser
ENTRYPOINT ["/app/entrypoint.sh"]
