# app/models/event_knowledge.py
from sqlalchemy import Column, String, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin
import uuid


class EventKnowledgeEntry(Base, TimestampMixin):
    """
    Per-event knowledge base for the participant chatbot.
    Committee adds FAQs, rules, judging criteria, schedule info, etc.
    Each entry is scoped to one event via FK — old events never bleed into new ones.
    Deleted automatically when the event is deleted (CASCADE).

    Categories: rules | faq | judging | schedule | submission | platform | general
    """
    __tablename__ = "event_knowledge_entries"

    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id  = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    category  = Column(String(50), nullable=False, default="general")
    title     = Column(Text, nullable=False)
    content   = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)