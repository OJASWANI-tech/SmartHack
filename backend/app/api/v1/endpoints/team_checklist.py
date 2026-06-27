import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.team import Team
from app.models.team_stage_checklist import TeamStageChecklist

router = APIRouter()


class ChecklistCreate(BaseModel):
    stage_id: uuid.UUID
    item_key: str
    label: str
    notes: Optional[str] = None


class ChecklistUpdate(BaseModel):
    is_complete: Optional[bool] = None
    notes: Optional[str] = None
    label: Optional[str] = None


class ChecklistTemplateItem(BaseModel):
    item_key: str
    label: str


class ChecklistTemplateCreate(BaseModel):
    items: list[ChecklistTemplateItem]


def serialize_item(item: TeamStageChecklist) -> dict:
    return {
        "id": str(item.id),
        "team_id": str(item.team_id),
        "stage_id": str(item.stage_id),
        "event_id": str(item.event_id),
        "item_key": item.item_key,
        "label": item.label,
        "is_complete": item.is_complete,
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        "notes": item.notes,
    }


async def get_item_or_404(
    db: AsyncSession,
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    item_id: uuid.UUID,
) -> TeamStageChecklist:
    item = (
        await db.execute(
            select(TeamStageChecklist).where(
                TeamStageChecklist.id == item_id,
                TeamStageChecklist.event_id == event_id,
                TeamStageChecklist.team_id == team_id,
            )
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found.")
    return item


@router.get("/events/{event_id}/teams/{team_id}/checklist")
async def list_team_checklist(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    items = (
        await db.execute(
            select(TeamStageChecklist)
            .where(TeamStageChecklist.event_id == event_id, TeamStageChecklist.team_id == team_id)
            .order_by(TeamStageChecklist.stage_id, TeamStageChecklist.item_key)
        )
    ).scalars().all()
    grouped = defaultdict(list)
    for item in items:
        grouped[str(item.stage_id)].append(serialize_item(item))
    return {"team_id": str(team_id), "items_by_stage": dict(grouped)}


@router.post("/events/{event_id}/teams/{team_id}/checklist")
async def create_checklist_item(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    body: ChecklistCreate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    existing = (
        await db.execute(
            select(TeamStageChecklist).where(
                TeamStageChecklist.team_id == team_id,
                TeamStageChecklist.stage_id == body.stage_id,
                TeamStageChecklist.item_key == body.item_key,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Checklist item already exists.")

    item = TeamStageChecklist(event_id=event_id, team_id=team_id, **body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return serialize_item(item)


@router.patch("/events/{event_id}/teams/{team_id}/checklist/{item_id}")
async def update_checklist_item(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    item_id: uuid.UUID,
    body: ChecklistUpdate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    item = await get_item_or_404(db, event_id, team_id, item_id)
    updates = body.model_dump(exclude_unset=True)
    if "is_complete" in updates:
        if updates["is_complete"] and not item.is_complete:
            item.completed_at = datetime.now(timezone.utc)
        if not updates["is_complete"]:
            item.completed_at = None
        item.is_complete = updates.pop("is_complete")
    for field, value in updates.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return serialize_item(item)


@router.delete("/events/{event_id}/teams/{team_id}/checklist/{item_id}")
async def delete_checklist_item(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    item_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    item = await get_item_or_404(db, event_id, team_id, item_id)
    await db.delete(item)
    await db.commit()
    return {"deleted": True, "id": str(item_id)}


@router.post("/events/{event_id}/stages/{stage_id}/checklist-template")
async def apply_checklist_template(
    event_id: uuid.UUID,
    stage_id: uuid.UUID,
    body: ChecklistTemplateCreate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    teams = (
        await db.execute(select(Team).where(Team.event_id == event_id))
    ).scalars().all()
    items_created = 0
    teams_updated = 0
    for team in teams:
        created_for_team = False
        for template_item in body.items:
            existing = (
                await db.execute(
                    select(TeamStageChecklist).where(
                        TeamStageChecklist.team_id == team.id,
                        TeamStageChecklist.stage_id == stage_id,
                        TeamStageChecklist.item_key == template_item.item_key,
                    )
                )
            ).scalar_one_or_none()
            if existing:
                continue
            db.add(
                TeamStageChecklist(
                    event_id=event_id,
                    team_id=team.id,
                    stage_id=stage_id,
                    item_key=template_item.item_key,
                    label=template_item.label,
                )
            )
            items_created += 1
            created_for_team = True
        if created_for_team:
            teams_updated += 1
    await db.commit()
    return {"teams_updated": teams_updated, "items_created": items_created}
