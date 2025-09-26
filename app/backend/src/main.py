from time import perf_counter

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse

from src.metrics import REQUEST_COUNT, REQUEST_LATENCY, prometheus_app

app = FastAPI(title="TinyTasks API (MVP)")

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

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/metrics")
def metrics():
    return PlainTextResponse(prometheus_app(), media_type="text/plain")

@app.get("/")
def root():
    return JSONResponse({"service": "tinytasks-backend", "version": "0.1.0"})
