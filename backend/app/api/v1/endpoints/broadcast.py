import uuid
import datetime
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.broadcast import Broadcast  
from app.core.dependencies import get_current_committee_member

router = APIRouter()

class BroadcastCreatePayload(BaseModel):
    title: str
    body: str
    type: str = "info"
    scope: str = "All Participants"

# 📢 COMMITTEE DASHBOARD SENDS BROADCAST HERE
@router.post("/{event_id}/broadcasts")
async def create_event_broadcast(
    event_id: uuid.UUID,
    payload: BroadcastCreatePayload,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    try:
        new_broadcast = Broadcast(
            id=uuid.uuid4(),  
            event_id=event_id,
            title=payload.title,
            body=payload.body,
            type=payload.type if payload.type else "info",
            scope=payload.scope if payload.scope else "All Participants",
            created_at=datetime.datetime.utcnow() 
        )
        
        db.add(new_broadcast)
        await db.commit()
        await db.refresh(new_broadcast)
        
        return {"status": "success", "detail": "Broadcast persisted and dispatched."}
        
    except Exception as e:
        await db.rollback()
        print("\n" + "="*50)
        print(f"❌ BROADCAST CRASH LOG: {str(e)}")
        print("="*50 + "\n")
        raise HTTPException(
            status_code=500, 
            detail=f"Database insertion failed: {str(e)}"
        )


# 👥 PARTICIPANT PORTAL FEEDS FROM HERE
@router.get("/{event_id}/announcements")
async def get_participant_announcements(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches real-time live event broadcasts to feed the participant dashboard timeline.
    """
    result = await db.execute(
        select(Broadcast)
        .where(Broadcast.event_id == event_id)
        .order_by(Broadcast.created_at.desc())
    )
    broadcasts = result.scalars().all()
    
    # 🎯 FIX: Match the exact key structures used inside your React component layout loop
    return [
        {
            "id": str(b.id),
            "title": b.title,
            "body": b.body if b.body else "",        # 🎯 Match frontend {ann.body}
            "type": b.type.lower() if b.type else "info", # Normalizes to match CATEGORY_STYLE keys
            "created_at": b.created_at if b.created_at else datetime.datetime.utcnow() # 🎯 Match frontend {ann.created_at}
        }
        for b in broadcasts
    ]