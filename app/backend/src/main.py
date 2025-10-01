from time import perf_counter

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse

from src.db import check_db 
from src.metrics import REQUEST_COUNT, REQUEST_LATENCY, prometheus_app
from src.db import init_db_schema
from src import models 

# Initialize database schema on app startup.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code executed on startup
    init_db_schema()
    yield

app = FastAPI(title="TinyTasks API (MVP)", lifespan=lifespan)

# Prometheus metrics middleware
# This middleware intercepts every HTTP request/response,
# measures request duration (latency), extracts method, path and status,
# and updates Prometheus counters and histograms accordingly.
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = perf_counter()
    response: Response = await call_next(request)
    duration = perf_counter() - start

    path = request.url.path
    method = request.method
    status = response.status_code

    REQUEST_COUNT.labels(method=method, path=path, status=status).inc()
    REQUEST_LATENCY.labels(method=method, path=path).observe(duration)
    return response

# Health check endpoint
# Used by orchestrators (Kubernetes, Docker, load balancers) 
# to verify that the service is alive and responding.
@app.get("/healthz")
def healthz():
    return {"status": "ok"}

# Database health check endpoint.
# For now: returns a placeholder response.
# Later: will actually ping PostgreSQL.
@app.get("/db/healthz")
def db_healthz():
    check_db()       
    return {"db": "ok"}

# Prometheus metrics endpoint
# Exposes collected application metrics in plain text format 
# so that Prometheus can scrape them periodically.
@app.get("/metrics")
def metrics():
    return PlainTextResponse(prometheus_app(), media_type="text/plain")

# Root endpoint
# Provides basic service information (name and version) 
# for quick identification or debugging.
@app.get("/")
def root():
    return JSONResponse({"service": __title__, "version": __version__})
