import datetime
from sqlalchemy import Column, String, DateTime, JSON, Integer

from sqlalchemy.sql import func
from app.db.base import Base

class AntiCheatReport(Base):
    __tablename__ = "anti_cheat_reports"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, index=True, nullable=False)
    task_id = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="PROCESSING", nullable=False)
    
    # 🌟 ENSURE THIS IS A JSON OR JSONB TYPE
    matches = Column(JSON, nullable=True, default=dict) 
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)