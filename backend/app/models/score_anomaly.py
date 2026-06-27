from sqlalchemy import Column, ForeignKey, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, synonym
from app.db.base import Base
import uuid

class ScoreAnomaly(Base):
    __tablename__ = "score_anomalies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    finalized_team_id = Column(
        "team_id",
        UUID(as_uuid=True), 
        ForeignKey("finalized_teams.id", ondelete="CASCADE"), 
        nullable=False
    )
    team_id = synonym("finalized_team_id")
    finalized_team = relationship("FinalizedTeam", back_populates="score_anomalies")
    severity = Column(String, nullable=False)
    divergence_score = Column(Float, nullable=False)
    ai_reasoning = Column(String, nullable=True)
    resolution_status = Column(String, default="unresolved")
    resolution_action = Column(String, nullable=True)
    committee_note = Column(String, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)