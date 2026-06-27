import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.db.base import Base


class MentorSession(Base):
    __tablename__ = "mentor_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_mins = Column(Integer, default=60)
    status = Column(String(20), default="scheduled")
    shared_notes = Column(Text, nullable=True)
    mentor_notes = Column(Text, nullable=True)
    action_items = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
