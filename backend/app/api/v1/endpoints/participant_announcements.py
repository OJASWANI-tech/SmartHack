from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_  # 🌟 FIXED: Added or_ import here

from app.db.session import get_db
# 🚀 IMPORT BOTH MODELS TO MERGE OR BRIDGE THE CHANNELS
from app.models.communication import Communication
from app.models.broadcast import Broadcast
from app.models.announcement import Announcement

from app.crud.announcement import (
    get_event_announcements,
    create_announcement
)
from app.schemas.announcement import (
    AnnouncementResponse,
    AnnouncementCreate
)

router = APIRouter(
    prefix="/announcements",
    tags=["Announcements"]
)

def time_ago(dt: datetime) -> str:
    """Convert datetime to '2h ago', '3d ago' style string"""
    if not dt:
        return ""
    # Ensure dt is timezone-aware if it comes naive from DB
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
        
    now = datetime.now(timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())

    if seconds < 0:  # Guard against tiny clock drifts
        return "Just now"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    elif seconds < 86400:
        return f"{seconds // 3600}h ago"
    else:
        return f"{diff.days}d ago"


# GET ALL ANNOUNCEMENTS
@router.get("", response_model=list[dict])  # Changed response model to match your custom array output signature
async def fetch_announcements(
    event_id: UUID,
    participant_id: UUID = None,  # 🌟 FIXED: Explicitly added participant_id as an optional route argument
    db: AsyncSession = Depends(get_db)
):
    announcements = []

    try:
        # 1. 📢 FETCH FROM YOUR NEW BROADCASTS TABLE
        broadcasts_result = await db.execute(
            select(Broadcast)
            .where(Broadcast.event_id == event_id)
            .order_by(Broadcast.created_at.desc())
        )
        live_broadcasts = broadcasts_result.scalars().all()

        for b in live_broadcasts:
            # Ensure timestamp has timezone for calculation comparison
            b_time = b.created_at.replace(tzinfo=timezone.utc) if b.created_at.tzinfo is None else b.created_at
            
            announcements.append({
                "id": str(b.id),
                "title": b.title,
                "body": b.body,
                "recipient_type": b.scope,
                "sent_at": b_time.isoformat(),
                "time_ago": time_ago(b_time),
                "type": b.type.lower() if b.type else "info"
            })

        # 2. ✉️ FETCH FROM EXISTING COMMUNICATIONS TABLE (IF ANY EXIST)
        # We only filter by participant_id if it's provided in the frontend query parameter string
        comm_filters = [
            Communication.event_id == event_id,
            Communication.status == "sent"
        ]
        
        if participant_id:
            comm_filters.append(
                or_(
                    Communication.recipient_type == "all",
                    Communication.recipient_id == participant_id
                )
            )
        else:
            comm_filters.append(Communication.recipient_type == "all")

        comm_results = (await db.execute(
            select(Communication)
            .where(*comm_filters)
            .order_by(Communication.sent_at.desc())
        )).scalars().all()

        for c in comm_results:
            c_time = c.sent_at.replace(tzinfo=timezone.utc) if c.sent_at and c.sent_at.tzinfo is None else c.sent_at
            announcements.append({
                "id": str(c.id),
                "title": c.subject,
                "body": c.body,
                "recipient_type": c.recipient_type,
                "sent_at": c_time.isoformat() if c_time else None,
                "time_ago": time_ago(c_time),
                "type": "urgent" if c_time and (
                    datetime.now(timezone.utc) - c_time
                ).total_seconds() < 21600 else "info"
            })


        # 3. 📣 FETCH FROM ANNOUNCEMENTS TABLE (system announcements)
        announcement_results = (await db.execute(
            select(Announcement)
            .where(Announcement.event_id == event_id)
            .order_by(Announcement.created_at.desc())
        )).scalars().all()

        for a in announcement_results:
            a_time = a.created_at.replace(tzinfo=timezone.utc) if a.created_at.tzinfo is None else a.created_at
            announcements.append({
                "id": str(a.id),
                "title": a.title,
                "body": a.message,        # ← note: model uses 'message', not 'body'
                "recipient_type": "all",
                "sent_at": a_time.isoformat().replace("+00:00", "Z"),
                "time_ago": time_ago(a_time),
                "type": a.type or "info"
            })
        # Sort the combined items so everything appears in order (newest first)
        announcements.sort(key=lambda x: x["sent_at"] or "", reverse=True)

    except Exception as e:
        print(f"Announcement fetch error: {e}")  # ← see exact error in terminal
        raise HTTPException(status_code=500, detail=f"Failed aggregating live feeds: {str(e)}")
        
    # 🌟 FIXED: Returning your aggregated custom 'announcements' structure instead of bypassing it for get_event_announcements
    return announcements


# CREATE ANNOUNCEMENT
@router.post("", response_model=AnnouncementResponse)
async def post_announcement(
    data: AnnouncementCreate,
    db: AsyncSession = Depends(get_db)
):
    return await create_announcement(
        db=db,
        event_id=data.event_id,
        title=data.title,
        message=data.message,
        announcement_type=data.type
    )