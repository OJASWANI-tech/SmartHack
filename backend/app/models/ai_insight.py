from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base, TimestampMixin
import uuid


class AIInsight(Base, TimestampMixin):
    __tablename__ = "ai_insights"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id     = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    team_id      = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    insight_type = Column(String(50), nullable=False) # 'summary', 'rubric_hints', 'feedback'
    content      = Column(JSONB, nullable=False, default=dict)
