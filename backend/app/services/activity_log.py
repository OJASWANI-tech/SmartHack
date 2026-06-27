from sqlalchemy.ext.asyncio import AsyncSession
from app.models.activity_log import ActivityLog
import uuid

async def log_action(
    db: AsyncSession,
    event_id: uuid.UUID,
    action_type: str,
    action: str,
    actor: str = "System Engine",
    meta: dict = None
):
    entry = ActivityLog(
        event_id=event_id,
        action_type=action_type,
        action=action,
        actor=actor,
        meta=meta
    )
    db.add(entry)
    await db.commit()