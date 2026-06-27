import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin


class EventWorkflow(Base, TimestampMixin):
    __tablename__ = "event_workflows"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id             = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True)
    workflow_template_id = Column(UUID(as_uuid=True), ForeignKey("workflow_templates.id", ondelete="SET NULL"), nullable=True)
    current_stage_id     = Column(UUID(as_uuid=True), ForeignKey("stage_instances.id", ondelete="SET NULL"), nullable=True)
    status               = Column(String(20), nullable=False, default="active")

    # Relationships
    event             = relationship("Event")
    workflow_template = relationship("WorkflowTemplate", back_populates="event_workflows")
    current_stage     = relationship("StageInstance", foreign_keys=[current_stage_id])