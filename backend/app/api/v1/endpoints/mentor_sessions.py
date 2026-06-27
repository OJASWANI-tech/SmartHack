import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.mentor_session import MentorSession

router = APIRouter()


class MentorSessionCreate(BaseModel):
    scheduled_at: datetime
    duration_mins: int = 60
    mentor_notes: Optional[str] = None
    shared_notes: Optional[str] = None
    action_items: list[dict] = Field(default_factory=list)


class MentorSessionUpdate(BaseModel):
    status: Optional[str] = None
    mentor_notes: Optional[str] = None
    shared_notes: Optional[str] = None
    action_items: Optional[list[dict]] = None
    duration_mins: Optional[int] = None


def serialize_session(session: MentorSession) -> dict:
    return {
        "id": str(session.id),
        "team_id": str(session.team_id),
        "event_id": str(session.event_id),
        "scheduled_at": session.scheduled_at.isoformat() if session.scheduled_at else None,
        "duration_mins": session.duration_mins,
        "status": session.status,
        "shared_notes": session.shared_notes,
        "mentor_notes": session.mentor_notes,
        "action_items": session.action_items or [],
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }


async def get_session_or_404(
    db: AsyncSession,
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    session_id: uuid.UUID,
) -> MentorSession:
    session = (
        await db.execute(
            select(MentorSession).where(
                MentorSession.id == session_id,
                MentorSession.event_id == event_id,
                MentorSession.team_id == team_id,
            )
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Mentor session not found.")
    return session


@router.get("/events/{event_id}/teams/{team_id}/mentor-sessions")
async def list_mentor_sessions(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    sessions = (
        await db.execute(
            select(MentorSession)
            .where(MentorSession.event_id == event_id, MentorSession.team_id == team_id)
            .order_by(MentorSession.scheduled_at.desc())
        )
    ).scalars().all()
    return {"sessions": [serialize_session(session) for session in sessions]}


@router.post("/events/{event_id}/teams/{team_id}/mentor-sessions")
async def create_mentor_session(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    body: MentorSessionCreate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    session = MentorSession(event_id=event_id, team_id=team_id, **body.model_dump())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return serialize_session(session)


@router.patch("/events/{event_id}/teams/{team_id}/mentor-sessions/{session_id}")
async def update_mentor_session(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    session_id: uuid.UUID,
    body: MentorSessionUpdate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session_or_404(db, event_id, team_id, session_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    await db.commit()
    await db.refresh(session)
    return serialize_session(session)


@router.delete("/events/{event_id}/teams/{team_id}/mentor-sessions/{session_id}")
async def delete_mentor_session(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    session_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session_or_404(db, event_id, team_id, session_id)
    await db.delete(session)
    await db.commit()
    return {"deleted": True, "id": str(session_id)}
