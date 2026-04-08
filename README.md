# TinyTasks DevOps Stand

TinyTasks DevOps Stand is a portfolio project built around a small task management application used as a foundation for practicing DevOps workflows and infrastructure.

It includes a FastAPI backend, React frontend, Docker-based local environment, and basic observability and testing setup.

---

## Current status

### Backend
- CRUD for tasks
- title validation
- filtering and pagination
- health endpoints (`/healthz`, `/db/healthz`)
- Prometheus metrics (`/metrics`)

### Frontend
- create / edit / delete / filter tasks
- dark mode
- served via Nginx

### DevOps
- multi-stage Dockerfiles (backend & frontend)
- Docker Compose local environment
- automatic Alembic migrations on startup
- backend test suite (pytest)

### API design
- REST semantics
- normalized Prometheus route labels (no high cardinality)

---

## Not implemented yet

- CI pipeline (GitHub Actions)
- Kubernetes / Helm
- ArgoCD / GitOps
- Terraform / Ansible
- Full observability stack (Prometheus + Grafana + logs)

---

## Tech stack

### Backend
- Python 3.12
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Prometheus client
- pytest

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- Nginx

### DevOps
- Docker
- Docker Compose

---

## Project structure
├── app
│ ├── backend
│ │ ├── alembic
│ │ ├── src
│ │ ├── tests
│ │ └── Dockerfile
│ └── frontend
│ ├── src
│ ├── Dockerfile
│ └── nginx.conf
├── docker-compose.yml
└── .env.example

