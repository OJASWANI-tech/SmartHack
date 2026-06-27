# app/api/v1/endpoints/event_knowledge.py
"""
Knowledge base management for the participant chatbot.
Committee members can CRUD knowledge entries per event.
Each entry is event-scoped — participants in other events never see it.

Categories: rules, faq, judging, schedule, submission, platform, general
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import asyncio
import uuid

from app.db.session import AsyncSessionLocal, get_db
from app.core.dependencies import require_role
from app.models.event_knowledge import EventKnowledgeEntry
from app.services.rag_service import index_kb_entry

router = APIRouter()

VALID_CATEGORIES = {"rules", "faq", "judging", "schedule", "submission", "platform", "general"}


async def index_kb_entry_background(event_id: uuid.UUID, entry_id: uuid.UUID, title: str, content: str) -> None:
    async with AsyncSessionLocal() as index_db:
        await index_kb_entry(index_db, event_id, entry_id, title, content)


class KBEntryCreate(BaseModel):
    title: str
    content: str
    category: str = "general"


class KBEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


# LIST
@router.get("/events/{event_id}/knowledge")
async def list_kb_entries(
    event_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    entries = (await db.execute(
        select(EventKnowledgeEntry)
        .where(EventKnowledgeEntry.event_id == event_id)
        .order_by(EventKnowledgeEntry.category, EventKnowledgeEntry.created_at)
    )).scalars().all()

    return {
        "event_id": str(event_id),
        "total": len(entries),
        "entries": [
            {
                "id": str(e.id),
                "category": e.category,
                "title": e.title,
                "content": e.content,
                "is_active": e.is_active,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
    }


# CREATE
@router.post("/events/{event_id}/knowledge")
async def create_kb_entry(
    event_id: uuid.UUID,
    body: KBEntryCreate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    if body.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Choose from: {', '.join(sorted(VALID_CATEGORIES))}"
        )

    entry = EventKnowledgeEntry(
        event_id=event_id,
        category=body.category,
        title=body.title.strip(),
        content=body.content.strip(),
        is_active=True,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    asyncio.create_task(index_kb_entry_background(entry.event_id, entry.id, entry.title, entry.content))

    return {
        "id": str(entry.id),
        "event_id": str(event_id),
        "category": entry.category,
        "title": entry.title,
        "content": entry.content,
        "is_active": entry.is_active,
    }


# UPDATE
@router.patch("/events/{event_id}/knowledge/{entry_id}")
async def update_kb_entry(
    event_id: uuid.UUID,
    entry_id: uuid.UUID,
    body: KBEntryUpdate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    entry = (await db.execute(
        select(EventKnowledgeEntry).where(
            EventKnowledgeEntry.id == entry_id,
            EventKnowledgeEntry.event_id == event_id,
        )
    )).scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="KB entry not found.")

    if body.category is not None and body.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Choose from: {', '.join(sorted(VALID_CATEGORIES))}"
        )

    if body.title is not None:
        entry.title = body.title.strip()
    if body.content is not None:
        entry.content = body.content.strip()
    if body.category is not None:
        entry.category = body.category
    if body.is_active is not None:
        entry.is_active = body.is_active

    await db.commit()
    await db.refresh(entry)
    asyncio.create_task(index_kb_entry_background(entry.event_id, entry.id, entry.title, entry.content))

    return {
        "id": str(entry.id),
        "category": entry.category,
        "title": entry.title,
        "content": entry.content,
        "is_active": entry.is_active,
    }


# DELETE
@router.delete("/events/{event_id}/knowledge/{entry_id}")
async def delete_kb_entry(
    event_id: uuid.UUID,
    entry_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    entry = (await db.execute(
        select(EventKnowledgeEntry).where(
            EventKnowledgeEntry.id == entry_id,
            EventKnowledgeEntry.event_id == event_id,
        )
    )).scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="KB entry not found.")

    await db.delete(entry)
    await db.commit()

    return {"deleted": True, "id": str(entry_id)}
