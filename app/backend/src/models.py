from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Task(Base):
    # ORM model for tasks table
    __tablename__ = "tasks"

    # Primary key: UUID stored as string
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))

    # Title length is validated at the API/schema layer.
    title: Mapped[str] = mapped_column(String(140), nullable=False)

    # Completion flag
    done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Server-side timestamps.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
