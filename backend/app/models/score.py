from sqlalchemy import Column, Boolean, Text, Numeric, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base
import uuid
from datetime import datetime


class Score(Base):
    __tablename__ = "scores"

    id                         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id                    = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    evaluator_id               = Column(UUID(as_uuid=True), ForeignKey("evaluators.id", ondelete="CASCADE"), nullable=False)
    stage_id                   = Column(UUID(as_uuid=True), ForeignKey("stages.id", ondelete="CASCADE"), nullable=True)
    score_value                = Column(Numeric(4, 2), nullable=False)
    criteria_breakdown         = Column(JSONB, default=dict)
    notes                      = Column(Text)
    flagged                    = Column(Boolean, default=False)
    submitted_at               = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Governance & Feedback extensions
    feedback_structured        = Column(JSONB, default=dict)
    ai_consistency_flag        = Column(Boolean, default=False)
    ai_consistency_note        = Column(Text)
    evaluation_duration_mins   = Column(Integer, default=0)

    # Relationships
    evaluator                  = relationship("Evaluator")