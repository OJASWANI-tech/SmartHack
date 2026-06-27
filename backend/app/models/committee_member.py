from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.sql import func
from app.db.base import Base
from uuid import UUID
import uuid
from sqlalchemy import Uuid

class CommitteeMember(Base):
    __tablename__ = "committee_members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)
    email = Column(String(100), unique=True, nullable=False, index=True)

    hashed_password = Column(String(200), nullable=True) # google users wont have a password

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)           # ← NEW

    invite_token = Column(String(200), nullable=True)      # ← NEW (hashed)
    invite_expires_at = Column(DateTime(timezone=True))    # ← NEW

    role = Column(String(50), default="member")            # ← NEW ("admin" or "member")

    created_at = Column(DateTime, server_default=func.now())
    # ADD THESE
    event_id = Column(Uuid, ForeignKey("events.id"), nullable=True)

    # -----------------------------
    # Google Authentication Fields
    # -----------------------------

    google_id = Column(String(255), unique=True, nullable=True)
    auth_provider = Column(String(50), nullable=False, default="local")
    avatar_url = Column(Text, nullable=True)
    password_setup_token = Column(String(200), nullable=True)
    password_setup_expires_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "auth_provider IN ('local', 'google', 'both')",
            name="ck_committee_members_auth_provider"
        ),
    )