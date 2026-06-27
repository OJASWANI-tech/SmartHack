import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.participant import Participant
from app.models.participant_notification import ParticipantNotification

router = APIRouter()


class NotificationCreate(BaseModel):
    participant_id: uuid.UUID
    title: str
    body: str
    type: str = "info"
    link_url: Optional[str] = None


class NotificationBroadcast(BaseModel):
    title: str
    body: str
    type: str = "info"
    link_url: Optional[str] = None


def serialize_notification(notification: ParticipantNotification) -> dict:
    return {
        "id": str(notification.id),
        "participant_id": str(notification.participant_id),
        "event_id": str(notification.event_id),
        "title": notification.title,
        "body": notification.body,
        "type": notification.type,
        "link_url": notification.link_url,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
    }


@router.post("/events/{event_id}/notifications")
async def create_notification(
    event_id: uuid.UUID,
    body: NotificationCreate,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    notification = ParticipantNotification(event_id=event_id, **body.model_dump())
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return serialize_notification(notification)


@router.post("/events/{event_id}/notifications/broadcast")
async def broadcast_notification(
    event_id: uuid.UUID,
    body: NotificationBroadcast,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    participants = (
        await db.execute(select(Participant).where(Participant.event_id == event_id))
    ).scalars().all()
    for participant in participants:
        db.add(
            ParticipantNotification(
                event_id=event_id,
                participant_id=participant.id,
                title=body.title,
                body=body.body,
                type=body.type,
                link_url=body.link_url,
            )
        )
    await db.commit()
    return {"notifications_created": len(participants)}


@router.get("/events/{event_id}/participants/{participant_id}/notifications")
async def list_participant_notifications(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    unread_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ParticipantNotification).where(
        ParticipantNotification.event_id == event_id,
        ParticipantNotification.participant_id == participant_id,
    )
    if unread_only:
        stmt = stmt.where(ParticipantNotification.is_read == False)
    notifications = (
        await db.execute(stmt.order_by(ParticipantNotification.created_at.desc()))
    ).scalars().all()
    return {"notifications": [serialize_notification(notification) for notification in notifications]}


@router.patch("/events/{event_id}/participants/{participant_id}/notifications/mark-all-read")
async def mark_all_notifications_read(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    notifications = (
        await db.execute(
            select(ParticipantNotification).where(
                ParticipantNotification.event_id == event_id,
                ParticipantNotification.participant_id == participant_id,
                ParticipantNotification.is_read == False,
            )
        )
    ).scalars().all()
    for notification in notifications:
        notification.is_read = True
    await db.commit()
    return {"marked_read": len(notifications)}


@router.patch("/events/{event_id}/participants/{participant_id}/notifications/{notif_id}/read")
async def mark_notification_read(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    notif_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    notification = (
        await db.execute(
            select(ParticipantNotification).where(
                ParticipantNotification.id == notif_id,
                ParticipantNotification.event_id == event_id,
                ParticipantNotification.participant_id == participant_id,
            )
        )
    ).scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return serialize_notification(notification)
