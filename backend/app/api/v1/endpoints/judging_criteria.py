import uuid
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.judging_criteria import JudgingCriterion

router = APIRouter()


class CriterionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    weight: Decimal = Decimal("1.0")
    max_score: Decimal = Decimal("10.0")
    guidance: Optional[str] = None
    sort_order: int = 0
    stage_id: Optional[uuid.UUID] = None


class CriterionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    weight: Optional[Decimal] = None
    max_score: Optional[Decimal] = None
    guidance: Optional[str] = None
    sort_order: Optional[int] = None
    stage_id: Optional[uuid.UUID] = None


def serialize_criterion(criterion: JudgingCriterion) -> dict:
    return {
        "id": str(criterion.id),
        "event_id": str(criterion.event_id),
        "stage_id": str(criterion.stage_id) if criterion.stage_id else None,
        "name": criterion.name,
        "description": criterion.description,
        "weight": float(criterion.weight) if criterion.weight is not None else None,
        "max_score": float(criterion.max_score) if criterion.max_score is not None else None,
        "guidance": criterion.guidance,
        "sort_order": criterion.sort_order,
        "created_at": criterion.created_at.isoformat() if criterion.created_at else None,
    }


async def get_criterion_or_404(
    db: AsyncSession,
    event_id: uuid.UUID,
    criterion_id: uuid.UUID,
) -> JudgingCriterion:
    criterion = (
        await db.execute(
            select(JudgingCriterion).where(
                JudgingCriterion.id == criterion_id,
                JudgingCriterion.event_id == event_id,
            )
        )
    ).scalar_one_or_none()
    if not criterion:
        raise HTTPException(status_code=404, detail="Judging criterion not found.")
    return criterion


@router.get("/events/{event_id}/judging-criteria")
async def list_judging_criteria(
    event_id: uuid.UUID,
    stage_id: Optional[uuid.UUID] = Query(default=None),
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(JudgingCriterion).where(JudgingCriterion.event_id == event_id)
    if stage_id:
        stmt = stmt.where(JudgingCriterion.stage_id == stage_id)
    criteria = (
        await db.execute(stmt.order_by(JudgingCriterion.sort_order, JudgingCriterion.created_at))
    ).scalars().all()
    return {"event_id": str(event_id), "total": len(criteria), "criteria": [serialize_criterion(c) for c in criteria]}


@router.post("/events/{event_id}/judging-criteria")
async def create_judging_criterion(
    event_id: uuid.UUID,
    body: CriterionCreate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    criterion = JudgingCriterion(event_id=event_id, **body.model_dump())
    db.add(criterion)
    await db.commit()
    await db.refresh(criterion)
    return serialize_criterion(criterion)


@router.patch("/events/{event_id}/judging-criteria/{criterion_id}")
async def update_judging_criterion(
    event_id: uuid.UUID,
    criterion_id: uuid.UUID,
    body: CriterionUpdate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    criterion = await get_criterion_or_404(db, event_id, criterion_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(criterion, field, value)
    await db.commit()
    await db.refresh(criterion)
    return serialize_criterion(criterion)


@router.delete("/events/{event_id}/judging-criteria/{criterion_id}")
async def delete_judging_criterion(
    event_id: uuid.UUID,
    criterion_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    criterion = await get_criterion_or_404(db, event_id, criterion_id)
    await db.delete(criterion)
    await db.commit()
    return {"deleted": True, "id": str(criterion_id)}
