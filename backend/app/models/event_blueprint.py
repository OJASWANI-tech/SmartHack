"""
event_blueprint.py — The core JSON blueprint that drives all dynamic event rendering.

A Blueprint is produced by the Config Agent and becomes the single source of truth
for the entire event's structure. Once committed, every downstream service reads
this instead of scattered config tables.

Blueprint JSON shape:
{
  "event": {
    "name": str,
    "type": str,           # "hackathon" | "tournament" | "case_competition" | "quiz" | ...
    "description": str,
    "mode": "solo" | "team",
    "entity_constraints": {
      "min_size": int,     # 1 for solo
      "max_size": int,
      "required_roles": [] # e.g. ["captain", "developer", "designer"]
    },
    "expected_participants": int,
    "registration_deadline": str | null,  # ISO date
    "timezone": str
  },
  "phases": [
    {
      "id": str,           # slug like "phase_1_submission"
      "name": str,
      "sequence": int,
      "engine": "SUBMISSION" | "MATCHUP" | "ASSESSMENT" | "AUTOMATED",
      "start_date": str | null,
      "end_date": str | null,
      "config": { ... }   # engine-specific config (see ENGINE_CONFIGS below)
    }
  ]
}

ENGINE_CONFIGS:

SUBMISSION:
  {"accepts": ["file"|"link"|"text"], "max_size_mb": int, "required_fields": [str]}

MATCHUP:
  {"format": "single_elimination"|"double_elimination"|"round_robin"|"swiss",
   "seeding": "random"|"ranked"|"manual", "third_place_match": bool}

ASSESSMENT:
  {"criteria": [{"name": str, "weight": float, "max_score": float}],
   "judges_per_entity": int, "score_aggregation": "average"|"weighted_average"|"trimmed_mean",
   "score_range": [float, float], "qualitative_feedback": bool,
   "anomaly_threshold_pct": float, "judge_assignment": "random"|"expertise"|"manual"}

AUTOMATED:
  {"type": "quiz"|"api_test"|"code_judge",
   "time_limit_minutes": int, "questions": [...] | null,
   "api_endpoint": str | null, "pass_score": float | null}
"""

import uuid
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.base import Base


class EventBlueprint(Base):
    """
    Stores the full structured blueprint for a dynamic event.
    One blueprint per event. Created by the Config Agent on commit.
    """
    __tablename__ = "event_blueprints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Linked to Event after commit; null while draft is in-progress
    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True,
    )

    # Linked back to the draft that produced it
    draft_id = Column(
        UUID(as_uuid=True),
        ForeignKey("event_drafts.id", ondelete="SET NULL"),
        nullable=True,
    )

    # The full blueprint JSON — single source of truth for rendering
    blueprint = Column(JSONB, nullable=False, default=dict)

    # Human-readable version for debugging / display
    version = Column(Integer, default=1)

    # "draft" | "validated" | "active" | "archived"
    status = Column(String(20), nullable=False, default="draft")

    # Validation errors caught before commit
    validation_errors = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())