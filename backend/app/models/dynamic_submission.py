"""
dynamic_submission.py — Generic, schema-agnostic submission store for the
/api/dynamic runtime track.

Unlike the MVP `submissions` table (which hard-codes ppt_url / github_url and
requires a fully-onboarded team + participant + stage row), this table is
deliberately decoupled from the heavy MVP entities so the dynamic engine can
accept *any* payload shape — GitHub links for coding, PDF/abstract for case
studies, match scores for sports, rebuttal text for debates — keyed only by a
free-form entity identifier (team name, participant email, etc.).

Runs entirely in parallel with the standard /committee, /participant and
/evaluator flows; nothing here touches those tables.
"""

import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.base import Base


class DynamicSubmission(Base):
    __tablename__ = "dynamic_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # The phase this submission belongs to. Nullable + SET NULL so a stage
    # rename/rebuild never orphans a submission row.
    stage_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stages.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Free-form entity identity — a team name, participant email, roster id,
    # whatever the dynamic event uses. Intentionally NOT a FK so the generic
    # runtime works without the full MVP onboarding.
    entity_id = Column(String(200), nullable=False, index=True)
    entity_label = Column(String(200), nullable=True)

    # "repo" | "document" | "text" | "roster" | "scores" | ... — drives display.
    submission_type = Column(String(50), nullable=True)

    # The actual submission contents, shape varies per event type.
    payload = Column(JSONB, nullable=False, default=dict)

    status = Column(String(20), nullable=False, default="submitted")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
