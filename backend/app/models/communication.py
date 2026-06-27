from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
import uuid
from datetime import datetime


class Communication(Base):
    __tablename__ = "communications"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id        = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    recipient_type  = Column(String(20))
    recipient_id    = Column(UUID(as_uuid=True), nullable=True)
    recipient_email = Column(String(255), nullable=False)
    subject         = Column(Text, nullable=False)
    body            = Column(Text, nullable=False)
    status          = Column(String(20), default="draft")
    resend_id       = Column(Text)
    failure_reason  = Column(Text)
    sent_at         = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)