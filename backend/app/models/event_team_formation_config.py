import uuid
from sqlalchemy import Column, Integer, ForeignKey, DateTime, ARRAY, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class EventTeamFormationConfig(Base):
    __tablename__ = "event_team_formation_config"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id    = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    min_size    = Column(Integer, nullable=False, default=1)
    max_size    = Column(Integer, nullable=False, default=1)
    factors     = Column(ARRAY(String), nullable=False, default=list)  # ["skill_level", "domain_preference", ...]
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())