import uuid
from sqlalchemy import Column, ForeignKey, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class EventResourceRequirement(Base):
    __tablename__ = "event_resource_requirements"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id    = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_id    = Column(UUID(as_uuid=True), ForeignKey("stages.id", ondelete="SET NULL"), nullable=True)

    category    = Column(String(20), nullable=False)   # staffing | venue | equipment | medical
    label       = Column(String(150), nullable=False)
    quantity    = Column(Integer, nullable=True)
    notes       = Column(Text, nullable=True)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
