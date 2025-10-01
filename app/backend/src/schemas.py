from datetime import datetime
from pydantic import BaseModel, Field

class TaskCreate(BaseModel):
    # Schema for creating a new task (input)
    title: str = Field(min_length=1, max_length=140)

class TaskRead(BaseModel):
    # Schema for reading task data (output)."""
    id: str
    title: str
    done: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Allows ORM objects to be converted into schema