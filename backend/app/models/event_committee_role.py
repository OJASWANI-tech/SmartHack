import uuid
from sqlalchemy import Column, ForeignKey, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class EventCommitteeRole(Base):
    __tablename__ = "event_committee_roles"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id    = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)

    role_name    = Column(String(150), nullable=False)
    description  = Column(Text, nullable=True)
    sort_order   = Column(Integer, default=0)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
