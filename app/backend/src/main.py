from time import perf_counter

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from pydantic import BaseModel

from typing import Optional

from src.db import check_db, get_db, init_db_schema
from src.metrics import REQUEST_COUNT, REQUEST_LATENCY, prometheus_app
from src.models import Task
from src.schemas import TaskCreate, TaskRead, TaskUpdate
from src import models

# Initialize database schema on app startup.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code executed on startup
    init_db_schema()
    yield

app = FastAPI(title="TinyTasks API (MVP)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite (React) dev server
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],           # allow all HTTP methods
    allow_headers=["*"],           # allow all headers
)

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

# Create a new task in DB.
@app.post("/api/tasks", response_model=TaskRead)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task = Task(title=payload.title)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

# Return all tasks from DB.
@app.get("/api/tasks", response_model=list[TaskRead])
def list_tasks(
    db: Session = Depends(get_db),
    done: Optional[bool] = Query(default=None, description="Filter by completion status"),
    limit: int = Query(default=50, ge=1, le=200, description="Max items to return"),
    offset: int = Query(default=0, ge=0, description="Number of items to skip"),
):
    # Return tasks with optional filtering and pagination.
    q = db.query(Task).order_by(Task.created_at.desc())
    if done is not None:
        q = q.filter(Task.done == done)
    return q.offset(offset).limit(limit).all()

# Return a single task by ID
@app.get("/api/tasks/{task_id}", response_model=TaskRead)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# Schema for updating a task (partial).
#class TaskUpdate(BaseModel):
#    title: str | None = None
#   done: bool | None = None

# Update a task by ID (title and/or done).
@app.patch("/api/tasks/{task_id}", response_model=TaskRead)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):

    # Find task by ID
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Reject empty payloads like {}
    if payload.title is None and payload.done is None:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    
    # Apply updates
    if payload.title is not None:
        task.title = payload.title
    if payload.done is not None:
        task.done = payload.done

    db.commit()
    db.refresh(task)
    return task

# Delete a task by ID. Returns 204 if deleted, 404 if not found
@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None