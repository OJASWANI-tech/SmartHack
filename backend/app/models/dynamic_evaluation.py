"""
dynamic_evaluation.py — Generic evaluator scoring store for the /api/dynamic
runtime track.

Maps a set of per-criterion scores against the event's dynamic rubric
(JudgingCriterion rows) and records the aggregated result. Decoupled from the
MVP `scores` table, which requires NOT-NULL FKs to teams + evaluators that the
standalone dynamic flow doesn't necessarily have.
"""

import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.base import Base


class DynamicEvaluation(Base):
    __tablename__ = "dynamic_evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    submission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dynamic_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Free-form evaluator identity (judge name / email).
    evaluator_label = Column(String(200), nullable=True)

    # {criterion_name: raw_score} as submitted by the evaluator.
    scores = Column(JSONB, nullable=False, default=dict)

    # Weighted/aggregated final score per the event's EventScoringConfig.
    aggregate_score = Column(Numeric(6, 2), nullable=True)

    feedback = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
