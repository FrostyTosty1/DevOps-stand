from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict

class TaskCreate(BaseModel):
    # Schema for creating a new task (input)
    title: str = Field(min_length=1, max_length=140)
    
    # Trim whitespace and forbid empty titles after trimming
    @field_validator("title")
    @classmethod
    def normalize_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title must not be empty")
        return v
    

class TaskUpdate(BaseModel):
    # Schema for updating a task (partial)."""
    title: str | None = None
    done: bool | None = None

    # If title is provided, validate like in TaskCreate
    @field_validator("title")
    @classmethod
    def normalize_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Title must not be empty")
        return v

class TaskRead(BaseModel):
    # Schema for reading task data (output)."""
    id: str
    title: str
    done: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)