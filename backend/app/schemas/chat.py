from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID



class MessageCreate(BaseModel):
    event_id: str = Field(..., description="The unique ID of the hackathon event")
    team_id: str = Field(..., description="The unique ID of the participant's team")
    participant_id: Optional[str] = Field(None, description="The unique identifier of the participant")
    channel: str = Field(..., description="Either 'team' or 'mentor'")
    message: Optional[str] = Field(None, description="The text content of the message")  
    
    # 🎯 FIXED: Changed field name to snake_case to catch the incoming frontend parameter
    audio_url: Optional[str] = Field(None, description="The Cloudinary URL for voice notes") 
    file_url: Optional[str] = None
    file_type: Optional[str] = None  # Expected: 'image', 'document', or 'audio'
    file_name: Optional[str] = None  # e.g., "resume.pdf" or "screenshot.png"
    sender_name: str = Field(..., description="The display name of the sender")
    sender_email: str = Field(..., description="The email address of the sender")

class MessageResponse(BaseModel):
    id: int  
    sender: str
    text: Optional[str] = None 
    email: str
    timestamp: str
    avatar: str
    
    # 🎯 FIXED: Map snake_case directly from the SQLAlchemy object attribute (.audio_url)
    audio_url: Optional[str] = None 

    # Pydantic V2 Configuration
    model_config = {
        "from_attributes": True  # 🎯 FIXED: Removed trailing comma so it functions as a boolean flag
    }