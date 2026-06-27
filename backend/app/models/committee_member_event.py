from sqlalchemy import Column, String, Integer, Text, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin, DateTime
import uuid
# Import Base after core types to prevent early circular reference evaluation crashes
from app.db.base import Base, TimestampMixin

class CommitteeMemberEvent(Base):
    __tablename__ = "committee_member_events"

    id        = Column(Integer, primary_key=True)
    member_id = Column(Integer, ForeignKey("committee_members.id", ondelete="CASCADE"), nullable=False)
    event_id  = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    role      = Column(String(50), default="owner")
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("member_id", "event_id", name="uq_member_event"),
    )