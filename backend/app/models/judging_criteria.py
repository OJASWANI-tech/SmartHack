import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class JudgingCriterion(Base):
    __tablename__ = "judging_criteria"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_id = Column(UUID(as_uuid=True), ForeignKey("stages.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Numeric(5, 2), nullable=False, default=1.0)
    max_score = Column(Numeric(6, 2), default=10.0)
    guidance = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())