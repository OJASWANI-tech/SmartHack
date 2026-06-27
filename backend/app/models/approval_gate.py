from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base
import uuid
from datetime import datetime


class ApprovalGate(Base):
    __tablename__ = "approval_gates"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id       = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    stage_id       = Column(UUID(as_uuid=True), ForeignKey("stages.id"), nullable=True)
    gate_type      = Column(String(100), nullable=False)
    action_payload = Column(JSONB)
    status         = Column(String(20), default="pending")
    reviewed_by    = Column(Integer, ForeignKey("committee_members.id"), nullable=True)
    committee_note = Column(Text)
    resolved_at    = Column(DateTime(timezone=True))
    created_at     = Column(DateTime(timezone=True), default=datetime.utcnow)