import uuid
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import AsyncSessionLocal, get_db
from app.models.event_faq import EventFaq
from app.services.rag_service import index_faq

router = APIRouter()


async def index_faq_background(event_id: uuid.UUID, faq_id: uuid.UUID, question: str, answer: str) -> None:
    async with AsyncSessionLocal() as index_db:
        await index_faq(index_db, event_id, faq_id, question, answer)


class FaqCreate(BaseModel):
    category: Optional[str] = None
    question: str
    answer: str
    sort_order: int = 0


class FaqUpdate(BaseModel):
    category: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


def serialize_faq(faq: EventFaq) -> dict:
    return {
        "id": str(faq.id),
        "event_id": str(faq.event_id),
        "category": faq.category,
        "question": faq.question,
        "answer": faq.answer,
        "sort_order": faq.sort_order,
        "is_active": faq.is_active,
        "created_at": faq.created_at.isoformat() if faq.created_at else None,
    }


async def get_faq_or_404(db: AsyncSession, event_id: uuid.UUID, faq_id: uuid.UUID) -> EventFaq:
    faq = (
        await db.execute(
            select(EventFaq).where(EventFaq.id == faq_id, EventFaq.event_id == event_id)
        )
    ).scalar_one_or_none()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found.")
    return faq


@router.get("/events/{event_id}/faqs")
async def list_event_faqs(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    faqs = (
        await db.execute(
            select(EventFaq)
            .where(EventFaq.event_id == event_id, EventFaq.is_active == True)
            .order_by(EventFaq.sort_order, EventFaq.created_at)
        )
    ).scalars().all()
    return {"event_id": str(event_id), "total": len(faqs), "faqs": [serialize_faq(f) for f in faqs]}


@router.post("/events/{event_id}/faqs")
async def create_event_faq(
    event_id: uuid.UUID,
    body: FaqCreate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    faq = EventFaq(event_id=event_id, **body.model_dump())
    db.add(faq)
    await db.commit()
    await db.refresh(faq)
    asyncio.create_task(index_faq_background(faq.event_id, faq.id, faq.question, faq.answer))
    return serialize_faq(faq)


@router.patch("/events/{event_id}/faqs/{faq_id}")
async def update_event_faq(
    event_id: uuid.UUID,
    faq_id: uuid.UUID,
    body: FaqUpdate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    faq = await get_faq_or_404(db, event_id, faq_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(faq, field, value)
    await db.commit()
    await db.refresh(faq)
    asyncio.create_task(index_faq_background(faq.event_id, faq.id, faq.question, faq.answer))
    return serialize_faq(faq)


@router.delete("/events/{event_id}/faqs/{faq_id}")
async def delete_event_faq(
    event_id: uuid.UUID,
    faq_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    faq = await get_faq_or_404(db, event_id, faq_id)
    await db.delete(faq)
    await db.commit()
    return {"deleted": True, "id": str(faq_id)}
