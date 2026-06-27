import uuid
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import AsyncSessionLocal, get_db
from app.models.stage import Stage
from app.services.rag_service import index_stage

router = APIRouter()


async def index_stage_background(
    event_id: uuid.UUID,
    stage_id: uuid.UUID,
    name: str,
    instructions: str | None,
    deliverables_text: str,
) -> None:
    async with AsyncSessionLocal() as index_db:
        await index_stage(index_db, event_id, stage_id, name, instructions, deliverables_text)


class StageDetailsUpdate(BaseModel):
    instructions: Optional[str] = None
    deliverables: Optional[list[dict]] = None
    resources: Optional[list[dict]] = None
    submission_deadline: Optional[datetime] = None
    tips: Optional[str] = None


def serialize_stage(stage: Stage) -> dict:
    return {
        "id": str(stage.id),
        "event_id": str(stage.event_id),
        "name": stage.name,
        "description": stage.description,
        "sequence_order": stage.sequence_order,
        "status": stage.status,
        "approval_required": stage.approval_required,
        "is_committee_visible": stage.is_committee_visible,
        "started_at": stage.started_at.isoformat() if stage.started_at else None,
        "completed_at": stage.completed_at.isoformat() if stage.completed_at else None,
        "instructions": stage.instructions,
        "deliverables": stage.deliverables or {},
        "resources": stage.resources or {},
        "submission_deadline": stage.submission_deadline.isoformat() if stage.submission_deadline else None,
        "tips": stage.tips,
        "created_at": stage.created_at.isoformat() if stage.created_at else None,
    }


async def get_stage_or_404(db: AsyncSession, event_id: uuid.UUID, stage_id: uuid.UUID) -> Stage:
    stage = (
        await db.execute(
            select(Stage).where(Stage.id == stage_id, Stage.event_id == event_id)
        )
    ).scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found.")
    return stage


@router.get("/events/{event_id}/stages/{stage_id}/details")
async def get_stage_details(
    event_id: uuid.UUID,
    stage_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    stage = await get_stage_or_404(db, event_id, stage_id)
    return serialize_stage(stage)


@router.patch("/events/{event_id}/stages/{stage_id}/details")
async def update_stage_details(
    event_id: uuid.UUID,
    stage_id: uuid.UUID,
    body: StageDetailsUpdate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    stage = await get_stage_or_404(db, event_id, stage_id)
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(stage, field, value)

    await db.commit()
    await db.refresh(stage)
    deliverables = stage.deliverables if isinstance(stage.deliverables, list) else []
    deliverables_text = " ".join([d.get("name", "") for d in deliverables if isinstance(d, dict)])
    asyncio.create_task(index_stage_background(stage.event_id, stage.id, stage.name, stage.instructions, deliverables_text))
    return serialize_stage(stage)
