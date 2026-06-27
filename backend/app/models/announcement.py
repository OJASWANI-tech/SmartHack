from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql.sqltypes import TIMESTAMP
from sqlalchemy.sql import func

import uuid

from app.db.base import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False
    )

    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(20), default="info")
    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )