# app/models/grievance.py
import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, func, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin

class Grievance(Base, TimestampMixin):
    __tablename__ = "grievances"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    team_name = Column(String, nullable=False)
    
    participant_id = Column(UUID(as_uuid=True), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_name = Column(String, nullable=False)
    
    category = Column(String, nullable=False)  # 'mentor_issue', 'team_conflict', 'other'
    detail = Column(Text, nullable=False)
    
    severity = Column(String, default="medium", nullable=False)  # 'high', 'medium', 'low'
    status = Column(String, default="pending", nullable=False)  # 'pending', 'resolved', 'rejected'
    
    resolution_note = Column(String, nullable=True)
    ai_drafted_reply = Column(Text, nullable=True)
    is_clicked = Column(Boolean, default=False, nullable=False)
