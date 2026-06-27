import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base

class DeliveryLog(Base):
    __tablename__ = "delivery_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # 🌟 UPDATED: Added ForeignKey link to the events table with CASCADE rule
    event_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("events.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    
    recipient_name = Column(String, nullable=False)
    recipient_email = Column(String, index=True, nullable=False)
    stage = Column(String, default="Welcome & Registration Confirmation")
    status = Column(String, default="Pending") # Pending, Delivered, Bounced
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    opened = Column(String, default="No")