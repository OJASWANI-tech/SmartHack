import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base


class EntityStageState(Base):
    __tablename__ = "entity_stage_state"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id          = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    stage_instance_id = Column(UUID(as_uuid=True), ForeignKey("stage_instances.id", ondelete="CASCADE"), nullable=False)
    entity_type       = Column(String(30), nullable=False)   # 'participant' | 'team'
    entity_id         = Column(UUID(as_uuid=True), nullable=False)
    status            = Column(String(30), nullable=False, default="pending")
    metadata          = Column(JSONB, nullable=False, default=dict)
    updated_at        = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    stage_instance = relationship("StageInstance", back_populates="entity_stage_states")