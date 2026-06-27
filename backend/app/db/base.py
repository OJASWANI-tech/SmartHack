from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
import uuid

# 1. Define the ONE AND ONLY true base metadata registry
class Base(DeclarativeBase):
    pass

# 2. Define your global Mixins
class TimestampMixin:
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# ─── 🚀 ADD THESE IMPORTS AT THE BOTTOM OF THE FILE ───
# Importing them here forces SQLAlchemy to register both classes together.
# Change the import paths if your files are in a different directory.

from app.models.finalized_team import FinalizedTeam
from app.models.score_anomaly import ScoreAnomaly
from app.models.submission import Submission

from app.models.team import Team
from app.models.participant import Participant
from app.models.event_knowledge import EventKnowledgeEntry
from app.models.grievance import Grievance
from app.models.challenge import Challenge
from app.models.event_faq import EventFaq
from app.models.judging_criteria import JudgingCriterion
from app.models.event_venue import EventVenue
from app.models.mentor_session import MentorSession
from app.models.team_stage_checklist import TeamStageChecklist
from app.models.participant_notification import ParticipantNotification
from app.models.ai_conversation import AiConversation
from app.models.ai_query_log import AiQueryLog
from app.models.anti_cheat import AntiCheatReport
# Dynamic event config models — must be imported after Event/Stage
from app.models.event_draft import EventDraft
from app.models.event_scoring_config import EventScoringConfig
from app.models.event_communication_config import EventCommunicationConfig
from app.models.event_budget import EventBudget
from app.models.event_committee_role import EventCommitteeRole
from app.models.event_resource_requirement import EventResourceRequirement
