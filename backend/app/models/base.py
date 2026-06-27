# app/db/base.py
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime
from datetime import datetime, timezone

# 1. Define the ONE AND ONLY true base metadata registry
class Base(DeclarativeBase):
    pass

# 2. Define your global Mixins

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

# 3. CRITICAL: Import your models AFTER Base is defined 
# so they attach themselves to this specific metadata registry.
from app.models.event import Event

# If you have other models, import them below so they get generated too:
# from app.models.participant import Participant
# from app.models.team import Team