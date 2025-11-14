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
 && pip wheel --no-cache-dir --no-deps -r requirements.txt -w /wheels

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
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

# App sources (no .env baked in)
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini ./
COPY entrypoint.sh ./entrypoint.sh

# Ensure entrypoint is executable
RUN chmod +x /app/entrypoint.sh

# Expose API port
EXPOSE 8080

# Healthcheck using curl (hits /healthz)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD sh -c "curl -fsS http://127.0.0.1:8080/healthz > /dev/null || exit 1"

USER appuser
ENTRYPOINT ["/app/entrypoint.sh"]
