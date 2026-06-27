# app/models/finalized_team.py
import uuid
# 🌟 Make sure ForeignKey is in the sqlalchemy imports list here:
from sqlalchemy import Column, String, ForeignKey, JSON, DateTime, Float, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship 
from app.db.base import Base

class FinalizedTeam(Base):
    __tablename__ = "finalized_teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # 🌟 UPDATED: Changed from a plain UUID column to a strict ForeignKey with CASCADE
    event_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("events.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    
    team_id = Column(UUID(as_uuid=True), unique=True, nullable=False) 
    name = Column(String, nullable=False)
    challenge = Column(String, nullable=True)
    llm_rationale = Column(String, nullable=True)
    
    # Denormalized storage: holds teammates snapshot
    members_snapshot = Column(JSON, nullable=False)
    
    # Mentor Columns
    mentor_name = Column(String, nullable=True)
    mentor_company = Column(String, nullable=True)
    mentor_email = Column(String, nullable=True)
    
    # ─── 📊 JUDGE SCORING & ANOMALY TRACKING SYSTEM ───
    scores_snapshot = Column(JSON, nullable=True, default=list)
    
    final_calculated_total = Column(Float, nullable=True, default=0.0)
    panel_average_innovation = Column(Float, nullable=True)
    panel_average_code = Column(Float, nullable=True)
    panel_average_presentation = Column(Float, nullable=True)
    panel_average_impact = Column(Float, nullable=True)
    
    # Anomaly Flagging & Correction Management State Machine
    has_active_anomaly = Column(Boolean, default=False, nullable=False)
    anomaly_details = Column(JSON, nullable=True) 
    is_corrected = Column(Boolean, default=False, nullable=False)
    correction_note = Column(String, nullable=True) 
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship map
    score_anomalies = relationship(
        "ScoreAnomaly", 
        back_populates="finalized_team", 
        cascade="all, delete-orphan"
    )