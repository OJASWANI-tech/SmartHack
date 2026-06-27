# app/models/participant.py
from sqlalchemy import Column, String, Text, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
import uuid

class Participant(Base, TimestampMixin):
    __tablename__ = "participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    
    # ⚠️ FIXED: Removed unique=True from the email column
    email = Column(String, nullable=False) 
    
    phone = Column(String)
    institution = Column(String)
    skill_tags = Column(ARRAY(String))
    experience_level = Column(String, default="beginner")
    domain = Column(String)
    portal_token = Column(String, unique=True)
    
    qualification_status = Column(String, default="pending")
    avatar_initials = Column(String, nullable=True)
    progression_confirmed = Column(Boolean, default=False)

    # Relationship with TeamMember
    team_memberships = relationship(
        "TeamMember", 
        back_populates="participant", 
        cascade="all, delete-orphan"
    )

    # 🔗 FIXED: Added the composite unique constraint
    __table_args__ = (
        UniqueConstraint('event_id', 'email', name='participants_event_email_uc'),
    )