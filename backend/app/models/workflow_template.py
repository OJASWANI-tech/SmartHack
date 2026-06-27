import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin


class WorkflowTemplate(Base, TimestampMixin):
    __tablename__ = "workflow_templates"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(String, nullable=False)
    event_type    = Column(String, nullable=False)
    workflow_json = Column(JSONB, nullable=False, default=dict)
    created_by    = Column(Integer, ForeignKey("committee_members.id"), nullable=True)

    # Relationships
    event_workflows = relationship("EventWorkflow", back_populates="workflow_template")