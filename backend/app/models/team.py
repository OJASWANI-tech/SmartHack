# app/models/team.py
from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
import uuid

class Team(Base, TimestampMixin):
    __tablename__ = "teams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String, nullable=False)
    challenge_id = Column(UUID(as_uuid=True), nullable=True)
    challenge = Column(Text)
    llm_rationale = Column(Text)
    final_score = Column(Numeric(5, 2))
    
    approval_status = Column(String, default="proposed")
    evaluation_status = Column(String, default="not_started")
    progression_status = Column(String, default="pending")
    
    # Mentor Details
    mentor_name = Column(String)
    mentor_company = Column(String)
    mentor_email = Column(String)
    next_session_datetime = Column(DateTime(timezone=True), nullable=True)

    # 🌟 NEW: Back-reference to Event model matching 'teams = relationship(..., back_populates="event")'
    event = relationship(
        "Event", 
        back_populates="teams"
    )

    # 🎯 FIXED INDENTATION: Aligned precisely to 4 spaces
    members = relationship(
        "TeamMember", 
        back_populates="team", 
        cascade="all, delete-orphan"
    )

    # 🎯 FIXED INDENTATION & REMOVED passive_deletes=True
    submissions = relationship(
        "Submission",
        back_populates="team",
        cascade="all, delete-orphan"
    )
