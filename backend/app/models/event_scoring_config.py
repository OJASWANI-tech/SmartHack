"""
EventScoringConfig — stores all scoring/evaluation settings for a dynamic event.

MVP events have no row here → services fall back to their hardcoded defaults.
"""
import uuid
from sqlalchemy import Column, Boolean, Integer, Numeric, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class EventScoringConfig(Base):
    __tablename__ = "event_scoring_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    score_scale_min = Column(Numeric(5, 2), default=0)
    score_scale_max = Column(Numeric(5, 2), default=10)

    aggregation_method = Column(
        String(30),
        default="weighted_average",
        nullable=False,
    )
    trimmed_mean_pct = Column(Numeric(4, 2), default=10.0)
    anomaly_threshold_pct = Column(Numeric(5, 2), default=20.0)

    judges_per_team = Column(Integer, default=2)
    total_judges = Column(Integer, nullable=True)
    mentor_count = Column(Integer, default=0)

    judge_selection = Column(String(30), default="expertise_based")
    judge_overlap = Column(String(30), default="single_stage")
    qualitative_feedback = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())