from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.announcement import Announcement

async def create_announcement(
    db: AsyncSession,
    event_id,
    title: str,
    message: str,
    announcement_type: str = "info"
):
    announcement = Announcement(
        event_id=event_id,
        title=title,
        message=message,
        type=announcement_type
    )

    db.add(announcement)

    await db.commit()

    await db.refresh(announcement)

    return announcement

async def get_event_announcements(
    db: AsyncSession,
    event_id
):
    result = await db.execute(
        select(Announcement)
        .where(Announcement.event_id == event_id)
        .order_by(Announcement.created_at.desc())
    )

    return result.scalars().all()