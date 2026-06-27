# app/schemas/event.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Any
from uuid import UUID  # 👈 You imported it directly here!
from datetime import datetime

class EventCreate(BaseModel):
    name: str
    event_type: str

class EventUpdate(BaseModel):
    name: Optional[str] = None
    event_type: Optional[str] = None
    stage_config: Optional[Any] = None

class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    event_type: str
    description: Optional[str] = None
    current_participant_stage: Optional[str] = None
    current_committee_stage: Optional[str] = None
    is_submission_open: bool = False
    stage_config: Optional[Any] = None
    event_mode_type: Optional[str] = None
    expected_teams: Optional[int] = None
    expected_participants: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    timezone: Optional[str] = None
    event_details: Optional[Any] = None
    defaults_applied: Optional[Any] = None
    ai_extracted_entities: Optional[Any] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class TargetedAnnouncementPayload(BaseModel):
    subject: Optional[str] = Field(None, description="Custom overarching notification topic string override")
    body: Optional[str] = Field(None, description="Dynamic block markdown body content insertion payload")
    team_id: Optional[UUID] = Field(None, description="Target a single unique team entity; if null, processes bulk sweeping") # 🎯 FIXED: Changed 'uuid.UUID' to 'UUID'
    include_leaderboard_context: bool = Field(False, description="Flag to inject dynamically calculated placement metrics")

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
 
TargetedAnnouncementPayload.model_rebuild()