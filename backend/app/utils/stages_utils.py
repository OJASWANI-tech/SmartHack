from datetime import datetime, timezone
from app.models.announcement import Announcement

def activate_stage(stage, db=None):
    stage.status = "active"
    stage.started_at = datetime.now(timezone.utc)
    if db:
        db.add(stage)

def complete_stage(stage, db=None):
    stage.status = "completed"
    stage.completed_at = datetime.now(timezone.utc)
    if db:
        db.add(stage)
    

async def create_system_announcement(
    db,
    event_id: int,
    title: str,
    message: str,
    type: str = "info"
):
    announcement = Announcement(
        event_id=event_id,
        title=title,
        message=message,
        type=type,
        created_at=datetime.now(timezone.utc)
    )

    db.add(announcement)
    await db.flush() 

def create_system_announcement_c_specific(
    db,
    event_id: int,
    title: str,
    message: str,
    type: str = "info"
):
    announcement = Announcement(
        event_id=event_id,
        title=title,
        message=message,
        type=type,
        created_at=datetime.now(timezone.utc)
    )

    db.add(announcement)