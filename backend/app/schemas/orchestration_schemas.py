from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime


class OptimizerConstraints(BaseModel):
    evaluators_per_team: int = 3
    max_workload: int = 4
    respect_availability: bool = True
    avoid_conflicts: bool = True


class RunOptimizationRequest(BaseModel):
    constraints: Optional[OptimizerConstraints] = None


class ScheduleSlot(BaseModel):
    team_id: UUID
    team_name: str
    evaluator_id: UUID
    evaluator_name: str
    room: str
    time_slot: str
    sequence_order: int


class ScheduleGridRead(BaseModel):
    event_id: UUID
    schedules: List[ScheduleSlot]


class AssignmentOverride(BaseModel):
    evaluator_id: UUID
    team_id: UUID


class AssignmentExplanation(BaseModel):
    evaluator_id: UUID
    evaluator_name: str
    team_id: UUID
    team_name: str
    compatibility_score: float
    reasoning: str
    workload: int
    institution_match: bool


class OptimizationAnalytics(BaseModel):
    total_evaluators: int
    total_teams: int
    total_assignments: int
    average_compatibility: float
    min_compatibility: float
    unassigned_teams: List[UUID]
    workload_distribution: Dict[str, int]


# Anomaly Schemas
class AnomalyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    team_id: UUID
    team_name: str
    severity: str
    divergence_score: float
    ai_reasoning: Optional[str] = None
    resolution_status: str
    resolution_action: Optional[str] = None
    committee_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime


class ResolveAnomalyRequest(BaseModel):
    resolution_action: str  # 'override_average', 're_evaluation', 'accepted'
    committee_note: Optional[str] = None
