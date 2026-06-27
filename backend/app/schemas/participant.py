from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ParticipantCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    institution: Optional[str] = None
    skill_tags: Optional[List[str]] = []
    experience_level: Optional[str] = "beginner"
    domain: Optional[str] = None


class ParticipantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    institution: Optional[str] = None
    skill_tags: Optional[List[str]] = []
    experience_level: Optional[str] = None
    domain: Optional[str] = None
    portal_token: Optional[str] = None
    progression_confirmed: bool
    created_at: datetime