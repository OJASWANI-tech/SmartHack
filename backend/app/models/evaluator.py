from sqlalchemy import Column, String, Numeric, ForeignKey, Integer, ARRAY, func, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base, TimestampMixin
import uuid


class Evaluator(Base, TimestampMixin):
    __tablename__ = "evaluators"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id             = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name                 = Column(String(150), nullable=False)
    email                = Column(String(255), nullable=False)
    weight               = Column(Numeric(3, 2), default=1.00)
    access_token         = Column(String(512))
    
    # Profile & Expertise Fields for matching/scheduling
    institution          = Column(String(255))
    domain               = Column(String(100))
    skill_tags           = Column(ARRAY(String), default=list)
    experience_level     = Column(String(20), default="intermediate")
    preferred_categories = Column(ARRAY(String), default=list)
    availability         = Column(JSONB, default=dict)
    max_workload         = Column(Integer, default=3)
    created_at           = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('email', 'event_id', name='uq_evaluator_email_event'),
        UniqueConstraint('access_token', 'event_id', name='uq_evaluator_token_event'),
    )