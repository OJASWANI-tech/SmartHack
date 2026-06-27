"""
EventDraft — persists a config-agent conversation session.

Lifecycle:
  draft  →  confirmed  →  committed
  (chatting)  (approved by committee)  (all DB rows created)

event_id is NULL during the conversation and filled in on commit.
"""
import uuid
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.base import Base


class EventDraft(Base):
    __tablename__ = "event_drafts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Filled in only after commit
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=True)

    created_by = Column(Integer, ForeignKey("committee_members.id"), nullable=True)

    # Full [{role, content}] conversation array
    messages = Column(JSONB, nullable=False, default=list)

    # Structured extracted fields – the 17 collected field dict
    collected_fields = Column(JSONB, nullable=False, default=dict)

    # LLM-generated summary shown to committee before approval
    summary_text = Column(Text, nullable=True)

    # draft → confirmed → committed
    status = Column(
        String(30),
        nullable=False,
        default="draft",
    )

    revision_count = Column(Integer, default=0)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())