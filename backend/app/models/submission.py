from sqlalchemy import Column, Text, String, ForeignKey, DateTime, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base

class Submission(Base):
    __tablename__ = "submissions"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Adding CASCADE here too, so deleting an event cleanly wipes submissions
    event_id        = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    stage_id        = Column(UUID(as_uuid=True), ForeignKey("stages.id"), nullable=False)
    
    # 🌟 THE FIX: Added ondelete="CASCADE" to tell PostgreSQL to allow the deletion
    team_id         = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    
    participant_id  = Column(UUID(as_uuid=True), ForeignKey("participants.id"), nullable=False)

    ppt_url         = Column(Text, nullable=True)
    github_url      = Column(Text, nullable=True)
    demo_video_url  = Column(Text, nullable=True)
    notes           = Column(Text, nullable=True)
    status          = Column(String(20), default="submitted")
    submission_type    = Column(String(50), nullable=True)        # add this
    submission_payload = Column(JSON, default=dict, nullable=False)  # add this

    submitted_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # 🌟 NEW: Maps back to the 'submissions' relationship we just added in the Team model
    team = relationship("Team", back_populates="submissions")

    # Prevent duplicate submissions per team per stage
    __table_args__ = (
        UniqueConstraint('team_id', 'stage_id', name='uq_team_stage_submission'),
    )