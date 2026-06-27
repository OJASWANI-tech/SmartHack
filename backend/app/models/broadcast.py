import uuid
import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Broadcast(Base):
    __tablename__ = "broadcasts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    type = Column(String, default="info") # info, urgent
    scope = Column(String, default="All Participants") # All Participants, All Judges
    created_at = Column(DateTime, default=datetime.datetime.utcnow)