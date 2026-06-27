"""
dynamic_match.py — Fixture/match store for the sports track of the /api/dynamic
runtime engine.

Mirrors the decoupling philosophy of dynamic_submission.py / dynamic_evaluation.py:
this table is additive and parallel to the MVP schema, keyed only to events.id and
(optionally) teams.id, so it never touches /committee, /participant or /evaluator
data for other event types. A match references real Team rows (sports teams are
formed via the existing /api/v1/events/{id}/form-teams engine, same as any other
dynamic event), but team_a_id/team_b_id are nullable so byes and unscheduled bracket
slots can exist before teams are assigned.
"""

import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.base import Base


class DynamicMatch(Base):
    __tablename__ = "dynamic_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Bracket placement. round_number orders rounds (1 = first round); match_number
    # orders matches within a round (used to render bracket columns).
    round_name = Column(String(100), nullable=True)
    round_number = Column(Integer, nullable=False, default=1)
    match_number = Column(Integer, nullable=False, default=1)
    bracket_format = Column(String(30), nullable=False, default="single_elim")

    team_a_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    team_b_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    team_a_score = Column(Integer, nullable=True)
    team_b_score = Column(Integer, nullable=True)
    winner_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)

    # Advancement pointer — the match the winner of this one feeds into.
    next_match_id = Column(UUID(as_uuid=True), ForeignKey("dynamic_matches.id", ondelete="SET NULL"), nullable=True)

    venue = Column(String(150), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    referee_label = Column(String(150), nullable=True)

    # scheduled | live | completed
    status = Column(String(20), nullable=False, default="scheduled")

    # Free-form timeline: fouls, cards, timeouts, score deltas. [{ts, type, label}]
    event_log = Column(JSONB, nullable=False, default=list)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
