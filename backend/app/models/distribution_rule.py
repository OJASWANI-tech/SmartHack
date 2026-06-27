from sqlalchemy import Column, Integer, String, JSON, Boolean
from app.models.base import Base, TimestampMixin

class DistributionRule(Base, TimestampMixin):
    __tablename__ = "distribution_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    team_size = Column(Integer, default=4)
    balance_skills = Column(Boolean, default=True)
    max_per_institution = Column(Integer, default=1)
    other_rules = Column(JSON)          # flexible rules
    is_active = Column(Boolean, default=True)