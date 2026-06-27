from sqlalchemy import Column, String, Numeric, ForeignKey, UniqueConstraint, DateTime, func 
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin
import uuid


class EvaluatorAssignment(Base, TimestampMixin):
    __tablename__ = "evaluator_assignments"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id           = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    evaluator_id       = Column(UUID(as_uuid=True), ForeignKey("evaluators.id", ondelete="CASCADE"), nullable=False)
    team_id            = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    compatibility_score = Column(Numeric(5, 2), default=0.00)
    reasoning          = Column(String)
    created_at         = Column(DateTime, default=func.now(), nullable=False)
    updated_at         = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("evaluator_id", "team_id", name="uq_evaluator_team_assignment"),
    )
