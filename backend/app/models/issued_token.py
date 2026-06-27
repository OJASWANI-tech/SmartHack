from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class IssuedToken(Base):
    __tablename__ = "issued_tokens"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(100), unique=True, nullable=False, index=True)
    recipient_email = Column(String(100))
    role = Column(String(20), nullable=False)
    submission_id = Column(String(36), nullable=True)  
    team_id = Column(String(36), nullable=True)       
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
