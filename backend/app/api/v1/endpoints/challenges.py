import uuid
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import AsyncSessionLocal, get_db
from app.models.challenge import Challenge
from app.models.team import Team
from app.services.rag_service import index_challenge

router = APIRouter()


async def index_challenge_background(
    event_id: uuid.UUID,
    challenge_id: uuid.UUID,
    title: str,
    description: str,
    scope: str | None,
    constraints: str | None,
) -> None:
    async with AsyncSessionLocal() as index_db:
        await index_challenge(index_db, event_id, challenge_id, title, description, scope, constraints)


class ChallengeCreate(BaseModel):
    title: str
    description: str
    scope: Optional[str] = None
    constraints: Optional[str] = None
    data_sources: Optional[str] = None
    expected_output: Optional[str] = None
    tags: Optional[list[str]] = None


class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scope: Optional[str] = None
    constraints: Optional[str] = None
    data_sources: Optional[str] = None
    expected_output: Optional[str] = None
    tags: Optional[list[str]] = None
    is_active: Optional[bool] = None


class AssignChallengeRequest(BaseModel):
    challenge_id: uuid.UUID


def serialize_challenge(challenge: Challenge) -> dict:
    return {
        "id": str(challenge.id),
        "event_id": str(challenge.event_id),
        "title": challenge.title,
        "description": challenge.description,
        "scope": challenge.scope,
        "constraints": challenge.constraints,
        "data_sources": challenge.data_sources,
        "expected_output": challenge.expected_output,
        "tags": challenge.tags or [],
        "is_active": challenge.is_active,
        "created_at": challenge.created_at.isoformat() if challenge.created_at else None,
    }


async def get_challenge_or_404(
    db: AsyncSession,
    event_id: uuid.UUID,
    challenge_id: uuid.UUID,
) -> Challenge:
    challenge = (
        await db.execute(
            select(Challenge).where(
                Challenge.id == challenge_id,
                Challenge.event_id == event_id,
            )
        )
    ).scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    return challenge


@router.get("/events/{event_id}/challenges")
async def list_challenges(
    event_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    challenges = (
        await db.execute(
            select(Challenge)
            .where(Challenge.event_id == event_id)
            .order_by(Challenge.created_at)
        )
    ).scalars().all()
    return {"event_id": str(event_id), "total": len(challenges), "challenges": [serialize_challenge(c) for c in challenges]}


@router.post("/events/{event_id}/challenges")
async def create_challenge(
    event_id: uuid.UUID,
    body: ChallengeCreate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    challenge = Challenge(event_id=event_id, **body.model_dump())
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    asyncio.create_task(index_challenge_background(challenge.event_id, challenge.id, challenge.title, challenge.description, challenge.scope, challenge.constraints))
    return serialize_challenge(challenge)


@router.get("/events/{event_id}/challenges/{challenge_id}")
async def get_challenge(
    event_id: uuid.UUID,
    challenge_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    challenge = await get_challenge_or_404(db, event_id, challenge_id)
    return serialize_challenge(challenge)


@router.patch("/events/{event_id}/challenges/{challenge_id}")
async def update_challenge(
    event_id: uuid.UUID,
    challenge_id: uuid.UUID,
    body: ChallengeUpdate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    challenge = await get_challenge_or_404(db, event_id, challenge_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(challenge, field, value)

    await db.commit()
    await db.refresh(challenge)
    asyncio.create_task(index_challenge_background(challenge.event_id, challenge.id, challenge.title, challenge.description, challenge.scope, challenge.constraints))
    return serialize_challenge(challenge)


@router.delete("/events/{event_id}/challenges/{challenge_id}")
async def delete_challenge(
    event_id: uuid.UUID,
    challenge_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    challenge = await get_challenge_or_404(db, event_id, challenge_id)
    await db.delete(challenge)
    await db.commit()
    return {"deleted": True, "id": str(challenge_id)}


@router.post("/events/{event_id}/teams/{team_id}/assign-challenge")
async def assign_challenge(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    body: AssignChallengeRequest,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    challenge = await get_challenge_or_404(db, event_id, body.challenge_id)
    team = (
        await db.execute(select(Team).where(Team.id == team_id, Team.event_id == event_id))
    ).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    team.challenge_id = challenge.id
    team.challenge = challenge.title
    await db.commit()
    await db.refresh(team)
    return {
        "team_id": str(team.id),
        "challenge_id": str(challenge.id),
        "challenge": challenge.title,
    }
