import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class EventVenue(Base):
    __tablename__ = "event_venues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    name = Column(Text, nullable=False)
    address = Column(Text, nullable=True)
    floor = Column(String(100), nullable=True)
    room_map_url = Column(Text, nullable=True)
    parking_info = Column(Text, nullable=True)
    wifi_ssid = Column(String(200), nullable=True)
    wifi_password = Column(String(200), nullable=True)
    check_in_info = Column(Text, nullable=True)
    contact_name = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
