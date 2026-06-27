from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.activity_log import ActivityLog
from typing import List
import uuid

router = APIRouter()

@router.get("/{event_id}/activity")
async def get_activity_log(
    event_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.event_id == event_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "action_type": log.action_type,
            "action": log.action,
            "actor": log.actor,
            "meta": log.meta,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]