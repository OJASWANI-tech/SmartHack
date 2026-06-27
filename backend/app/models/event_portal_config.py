import uuid
from sqlalchemy import Column, Boolean, ForeignKey, DateTime, ARRAY, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class EventPortalConfig(Base):
    __tablename__ = "event_portal_config"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id    = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Evaluator portal
    evaluator_role_label        = Column(String(50), default="Evaluator")   # Judge | Referee | Evaluator
    evaluator_blind_judging     = Column(Boolean, default=False)
    evaluator_can_comment       = Column(Boolean, default=True)
    evaluator_assignment_via    = Column(String(20), default="portal")       # email | portal

    # Committee config
    committee_can_override_scores   = Column(Boolean, default=True)
    committee_approval_gates        = Column(Boolean, default=True)
    announcement_channels           = Column(ARRAY(String), default=lambda: ["in_app"])  # email | in_app | sms

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())