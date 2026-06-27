import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class TeamStageChecklist(Base):
    __tablename__ = "team_stage_checklist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    stage_id = Column(UUID(as_uuid=True), ForeignKey("stages.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    item_key = Column(String(100), nullable=False)
    label = Column(Text, nullable=False)
    is_complete = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("team_id", "stage_id", "item_key", name="uq_team_stage_checklist_item"),
    )
