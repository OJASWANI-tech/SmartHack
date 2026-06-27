from dotenv import load_dotenv
load_dotenv()

import jwt
import uuid
import datetime
import os
from typing import Tuple

from app.core.config import settings

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM

def create_committee_tokens(member_id: int, email: str, role: str = "committee", event_id: str = None) -> Tuple[str, str]:
    """Returns (access_token, refresh_token)."""
    access_payload = {
        "jti": str(uuid.uuid4()),
        "sub": str(member_id),
        "email": email,
        "role": role,
        "committee_role": role,
        "type": "access",
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
    }
    # Add event_id if provided (for members who are tied to a specific event)
    if event_id:
        access_payload["event_id"] = str(event_id)
    refresh_payload = {
        "jti": str(uuid.uuid4()),
        "sub": str(member_id),
        "email": email,
        "role": role,
        "committee_role": role,
        "type": "refresh",
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30),
    }
    return (
        jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM),
        jwt.encode(refresh_payload, SECRET_KEY, algorithm=ALGORITHM),
    )

from uuid import UUID

def create_evaluator_token(email: str, evaluator_id: uuid.UUID, event_id: uuid.UUID) -> Tuple[str, str, datetime.datetime]:
    jti = str(uuid.uuid4())
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=60) 
    payload = {
        "jti": jti,
        "sub": email,
        "role": "evaluator",
        "evaluator_id": str(evaluator_id),
        "event_id": str(event_id),
        "type": "link",
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": expires,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM), jti, expires

def create_participant_token(email: str, team_id: UUID, participant_id: UUID, event_id) -> Tuple[str, str, datetime.datetime]:
    jti = str(uuid.uuid4())
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=60)
    payload = {
        "jti": jti,
        "participant_id": str(participant_id),
        "sub": email,
        "role": "participant",
        "team_id": str(team_id),               # ← serialize UUID to string
        "event_id": str(event_id),
        "type": "link",
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": expires,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM), jti, expires

def decode_token(token: str) -> dict:
    """Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
