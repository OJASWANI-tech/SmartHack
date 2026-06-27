from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import validates
from app.db.base import Base
import uuid
from datetime import datetime


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id    = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(Text, nullable=False)
    action      = Column(String(255), nullable=False)
    actor       = Column(String(50), default="system")
    meta        = Column(JSONB)
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)

    @validates("action")
    def validate_action(self, key, value):
        if value and len(value) > 255:
            return value[:251] + "..."
        return value