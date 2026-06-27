"""
stage.py — Updated Stage model supporting the 4 execution engines.

engine_type replaces the old stage_type enum and drives which
execution module handles this phase at runtime.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Stage(Base):
    __tablename__ = "stages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Human-readable name from organizer
    name = Column(String(200), nullable=False)
    description = Column(Text)
    sequence_order = Column(Integer, nullable=False)

    # -----------------------------------------------------------------
    # ENGINE TYPE — the core of event-agnostic execution
    # SUBMISSION  : file/link/text intake from participants
    # MATCHUP     : brackets, fixtures, pairings
    # ASSESSMENT  : rubric-based jury scoring
    # AUTOMATED   : quiz, code judge, API-based test
    # -----------------------------------------------------------------
    engine_type = Column(
        String(20),
        nullable=False,
        default="ASSESSMENT",
    )

    # Legacy compatibility — keep stage_type for existing endpoints
    # Maps to engine_type; agents set both
    stage_type = Column(String(50), nullable=False, default="custom")

    # Engine-specific configuration (see blueprint docstring for shapes)
    engine_config = Column(JSONB, nullable=False, default=dict)

    # General config blob (retained for backward compat)
    config = Column(JSONB, default=dict)

    # Visibility / state
    status = Column(String(20), default="upcoming")  # upcoming|active|completed|skipped
    audience = Column(String(20), default="both")    # participants|committee|both
    is_system_phase = Column(Boolean, default=False, nullable=False)  # True for intake/formation/approval stages
    is_committee_visible = Column(Boolean, default=True, nullable=False)
    is_participant_visible = Column(Boolean, default=False, nullable=False)
    approval_required = Column(Boolean, default=False)

    # Timing
    start_date = Column(DateTime(timezone=True), nullable=True)
    submission_deadline = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Participant-facing content
    instructions = Column(Text, nullable=True)
    deliverables = Column(JSONB, nullable=True, default=dict)
    resources = Column(JSONB, nullable=True, default=dict)
    tips = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())