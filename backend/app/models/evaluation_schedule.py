from sqlalchemy import Column, String, ForeignKey, Integer, UniqueConstraint, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin
import uuid


class EvaluationSchedule(Base, TimestampMixin):
    __tablename__ = "evaluation_schedules"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id       = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    assignment_id  = Column(UUID(as_uuid=True), ForeignKey("evaluator_assignments.id", ondelete="CASCADE"), nullable=False)
    room           = Column(String(100), nullable=False)
    time_slot      = Column(String(100), nullable=False)
    sequence_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("assignment_id", name="uq_schedule_assignment"),
    )
