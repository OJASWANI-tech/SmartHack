from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID  # 🎯 Add this import
from sqlalchemy.sql import func
from app.db.base import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("finalized_teams.team_id"), nullable=False, index=True)
    participant_id = Column(String, nullable=True)
    channel = Column(String, nullable=False)  
    sender_name = Column(String, nullable=False)
    sender_email = Column(String, nullable=False)
    
    # Existing text column (make it nullable in case a message is ONLY audio)
    text = Column(Text, nullable=True) 
    
    # 🎯 NEW: Add a dedicated column for the Cloudinary URL
    audio_url = Column(String, nullable=True) 
    # 🎯 NEW columns for generic media and document support
    file_url = Column(String, nullable=True)   # Holds Cloudinary URL for images/docs
    file_type = Column(String, nullable=True)  # 'image', 'document', or 'audio'
    file_name = Column(String, nullable=True)  # Store original filename (important for PDFs/Docs)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())