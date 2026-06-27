from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class AnnouncementCreate(BaseModel):
    event_id: UUID
    title: str
    message: str
    type: str = "info"

class AnnouncementResponse(BaseModel):
    id: UUID
    title: str
    message: str
    type: str
    created_at: datetime

    class Config:
        from_attributes = True