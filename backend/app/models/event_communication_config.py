"""
EventCommunicationConfig — one row per automated-email trigger for a dynamic event.

trigger_type examples: team_assignment, evaluation_request, results_published,
                       progression_invite, deadline_reminder
"""
import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.db.base import Base


class EventCommunicationConfig(Base):
    __tablename__ = "event_communication_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    # NULL = not tied to a specific stage (e.g. welcome email)
    stage_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stages.id", ondelete="CASCADE"),
        nullable=True,
    )

    trigger_type = Column(String(50), nullable=False)
    enabled = Column(Boolean, default=True)
    template_key = Column(String(100), nullable=True)
    send_offset_hours = Column(Integer, nullable=True)

    recipient_scope = Column(String(50), nullable=False, default="all_participants")
    # JSON blob for any extra filtering/metadata from the agent conversation
    recipient_filter = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())