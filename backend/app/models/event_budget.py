import uuid
from sqlalchemy import Column, Boolean, ForeignKey, DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class EventBudget(Base):
    __tablename__ = "event_budget"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id    = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    total_budget         = Column(Numeric(14, 2), nullable=True)
    currency              = Column(String(10), default="INR")
    sponsorship_target    = Column(Numeric(14, 2), nullable=True)
    track_expenses         = Column(Boolean, default=True)
    track_sponsorship       = Column(Boolean, default=True)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
