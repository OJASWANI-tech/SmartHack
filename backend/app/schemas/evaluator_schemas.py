from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime


class EvaluatorProfileUpdate(BaseModel):
    institution: Optional[str] = None
    domain: Optional[str] = None
    skill_tags: Optional[List[str]] = []
    experience_level: Optional[str] = "intermediate"
    preferred_categories: Optional[List[str]] = []
    availability: Optional[Dict[str, Any]] = {}
    max_workload: Optional[int] = 3


class EvaluatorProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    name: str
    email: str
    weight: float
    institution: Optional[str] = None
    domain: Optional[str] = None
    skill_tags: List[str] = []
    experience_level: str
    preferred_categories: List[str] = []
    availability: Dict[str, Any] = {}
    max_workload: int
    created_at: datetime


class EvaluatorAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    evaluator_id: UUID
    team_id: UUID
    compatibility_score: float
    reasoning: Optional[str] = None
    created_at: datetime


class EvaluatorScoreSubmit(BaseModel):
    team_id: UUID
    score_value: float = Field(..., ge=0.0, le=10.0)
    criteria_breakdown: Dict[str, float]  # Innovation, Execution, etc.
    notes: Optional[str] = None
    feedback_structured: Optional[Dict[str, str]] = {}
    evaluation_duration_mins: Optional[int] = 0


class EvaluatorScoreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    team_id: UUID
    team_name: Optional[str] = None
    evaluator_id: UUID
    score_value: float
    criteria_breakdown: Dict[str, float]
    notes: Optional[str] = None
    flagged: bool
    feedback_structured: Dict[str, str] = {}
    ai_consistency_flag: bool
    ai_consistency_note: Optional[str] = None
    evaluation_duration_mins: int
    submitted_at: datetime


class RescoreRequestSubmit(BaseModel):
    team_id: UUID
    reason: str


class EvaluatorDashboardSummary(BaseModel):
    pending_count: int
    completed_count: int
    total_assigned: int
    average_score: float
    total_time_spent_mins: int
