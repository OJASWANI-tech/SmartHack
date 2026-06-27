from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


class StageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    name: str
    description: Optional[str] = None
    sequence_order: int
    status: str
    approval_required: bool
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class EvaluatorCreate(BaseModel):
    name: str
    email: str
    weight: float = 1.00


class EvaluatorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    name: str
    email: str
    weight: float
    access_token: Optional[str] = None
    created_at: datetime


class ScoreSubmit(BaseModel):
    team_id: UUID
    score_value: float = Field(..., ge=0.0, le=10.0)
    criteria_breakdown: Optional[Any] = {}
    notes: Optional[str] = None


class ScoreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    team_id: UUID
    evaluator_id: UUID
    score_value: float
    flagged: bool
    notes: Optional[str] = None
    submitted_at: datetime


class ApprovalGateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    gate_type: str
    status: str
    action_payload: Optional[Any] = None
    committee_note: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class ApprovalAction(BaseModel):
    committee_note: Optional[str] = None


class CommunicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    recipient_type: Optional[str] = None
    recipient_email: str
    subject: str
    status: str
    sent_at: Optional[datetime] = None
    created_at: datetime


class MessageResponse(BaseModel):
    message: str
    detail: Optional[Any] = None