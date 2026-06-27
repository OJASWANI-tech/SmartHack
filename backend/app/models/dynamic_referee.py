"""
dynamic_referee.py — Referee/official roster for the sports track of the
/api/dynamic runtime engine.

Additive and parallel to the MVP schema (mirrors dynamic_match.py / dynamic_
submission.py): keyed only to events.id, so it never touches /committee,
/participant or /evaluator data. access_code is the "simple profile lock" the
brief asks for — a referee enters it on the Referee Console to unlock their
queue, no full auth system required for this track.
"""

import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class DynamicReferee(Base):
    __tablename__ = "dynamic_referees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=True)
    assigned_sport = Column(String(150), nullable=True)  # free text: "Football", "All Matches", etc.

    access_code = Column(String(12), nullable=False, unique=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
