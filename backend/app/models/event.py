# app/models/event.py
import uuid
from sqlalchemy import Column, String, JSON, Boolean, ForeignKey, Integer, Text, DateTime  # Combined imports safely
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship  # Added relationship import

# Import Base after core types to prevent early circular reference evaluation crashes
from app.db.base import Base, TimestampMixin

class Event(Base, TimestampMixin):
    __tablename__ = "events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    current_participant_stage = Column(String(100), default="Event created")
    current_committee_stage   = Column(String(100), default="Event created")
    is_submission_open = Column(Boolean, default=False, nullable=False)
    stage_config = Column(JSON, default=dict)
    event_mode   = Column(String(20), nullable=False, default="legacy")

    # Dynamic event config columns (added for conversational agent)
    description    = Column(Text, nullable=True)
    config_source  = Column(String(20), nullable=False, default="fixed")   # 'fixed' | 'conversational'
    config_status  = Column(String(30), nullable=False, default="configured")  # 'draft' | 'configured' | 'active' | 'completed'
    configured_at  = Column(DateTime(timezone=True), nullable=True)

    # Scalar event-level fields (previously buried in stage_config JSON)
    event_mode_type         = Column(String(10), default="team")        # solo | team
    expected_teams          = Column(Integer, nullable=True)
    expected_participants   = Column(Integer, nullable=True)
    registration_deadline   = Column(DateTime(timezone=True), nullable=True)
    start_date               = Column(DateTime(timezone=True), nullable=True)  # overall event window start
    end_date                 = Column(DateTime(timezone=True), nullable=True)  # overall event window end
    timezone                = Column(String(60), nullable=True)

    created_by = Column(Integer, ForeignKey("committee_members.id"), nullable=True)

    # Universal Event Model — populated by the AI config agent on commit.
    # event_type/stage_config (above) hold the type key + generated workflow stages;
    # these three hold the rest of the normalized model.
    event_details          = Column(JSON, default=dict)  # participants, resources, timeline, judging
    defaults_applied       = Column(JSON, default=dict)  # which optional fields were auto-filled, and why
    ai_extracted_entities  = Column(JSON, default=dict)  # activities, tracks, committees, competition_categories, roles, deliverables, constraints, special_requirements

    # Preserve your working relationship cascade link
    teams = relationship(
        "Team",
        back_populates="event",
        cascade="all, delete-orphan"
    )