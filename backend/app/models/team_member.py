# app/models/team_member.py
from sqlalchemy import Column, ForeignKey, Boolean, String, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
import uuid

class TeamMember(Base, TimestampMixin):
    __tablename__ = "team_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(UUID(as_uuid=True), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)

    is_leader = Column(Boolean, default=False)

    # Sports roster lineup fields (used by the /dynamic/sports participant portal's
    # My Roster tab). Nullable/defaulted so this is a no-op for non-sports events.
    position = Column(String(60), nullable=True)
    jersey_number = Column(Integer, nullable=True)
    athlete_status = Column(String(20), nullable=False, default="active")  # active | injured | benched

    # Relationships
    team = relationship("Team", back_populates="members")
    participant = relationship("Participant", back_populates="team_memberships")

    # Correct way to define unique constraint
    __table_args__ = (
        UniqueConstraint('team_id', 'participant_id', name='team_members_team_id_participant_id_key'),
    )