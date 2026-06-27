import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin


class StageInstance(Base, TimestampMixin):
    __tablename__ = "stage_instances"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id       = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    stage_id       = Column(UUID(as_uuid=True), ForeignKey("stages.id", ondelete="SET NULL"), nullable=True)
    stage_type     = Column(String(50), nullable=False, default="custom")
    sequence_order = Column(Integer, nullable=False)
    status         = Column(String(20), nullable=False, default="upcoming")
    config         = Column(JSONB, nullable=False, default=dict)
    started_at     = Column(TIMESTAMP(timezone=True), nullable=True)
    completed_at   = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    event               = relationship("Event")
    stage               = relationship("Stage")
    entity_stage_states = relationship("EntityStageState", back_populates="stage_instance", cascade="all, delete-orphan")