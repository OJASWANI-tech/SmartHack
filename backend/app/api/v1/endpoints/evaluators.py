from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.evaluator import Evaluator
from app.models.event import Event
from app.schemas.common import EvaluatorCreate, EvaluatorRead, MessageResponse
from typing import List
import uuid
import secrets
from app.services.activity_log import log_action

router = APIRouter()


@router.post("/{event_id}/evaluators", response_model=EvaluatorRead)
async def add_evaluator(
    event_id: uuid.UUID,
    payload: EvaluatorCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = await db.execute(
        select(Evaluator).where(
            Evaluator.email == payload.email
        )
    )
    existing_eval = existing.scalar_one_or_none()
    if existing_eval:
        if existing_eval.event_id == event_id:
            raise HTTPException(status_code=400, detail="Evaluator already exists in this event.")
        else:
            # Re-associate evaluator to this event
            existing_eval.event_id = event_id
            existing_eval.name = payload.name
            existing_eval.weight = payload.weight
            await db.commit()
            await db.refresh(existing_eval)
            return existing_eval

    access_token = secrets.token_urlsafe(32)

    evaluator = Evaluator(
        event_id=event_id,
        name=payload.name,
        email=payload.email,
        weight=payload.weight,
        access_token=access_token,
    )
    db.add(evaluator)

    await log_action(
        db=db,
        event_id=event_id,
        action_type="System",
        action=f"Evaluator {payload.name} re-associated to event",
        actor="Admin Portal",
        meta={"email": payload.email}
    )
    await db.commit()
    await db.refresh(evaluator)
    return evaluator


@router.get("/{event_id}/evaluators", response_model=List[EvaluatorRead])
async def list_evaluators(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Evaluator).where(Evaluator.event_id == event_id)
    )
    return result.scalars().all()


@router.delete("/{event_id}/evaluators/{evaluator_id}", response_model=MessageResponse)
async def remove_evaluator(
    event_id: uuid.UUID,
    evaluator_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Evaluator).where(
            Evaluator.id == evaluator_id,
            Evaluator.event_id == event_id,
        )
    )
    evaluator = result.scalar_one_or_none()
    if not evaluator:
        raise HTTPException(status_code=404, detail="Evaluator not found")

    await db.delete(evaluator)

    await log_action(
        db=db,
        event_id=event_id,
        action_type="System",
        action=f"Evaluator {evaluator.name} added to event",
        actor="Admin Portal",
        meta={"email": evaluator.email}
    )
    await db.commit()
    return {"message": f"Evaluator {evaluator.name} removed successfully."}