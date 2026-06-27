from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.communication import Communication
from app.models.activity_log import ActivityLog
from app.models.event import Event
from app.schemas.common import CommunicationRead, MessageResponse
from typing import List
import uuid
from app.services.activity_log import log_action

router = APIRouter()


@router.get("/{event_id}/communications", response_model=List[CommunicationRead])
async def list_communications(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Communication)
        .where(Communication.event_id == event_id)
        .order_by(Communication.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{event_id}/communications/log", response_model=CommunicationRead)
async def log_communication(
    event_id: uuid.UUID,
    recipient_email: str,
    subject: str,
    body: str,
    recipient_type: str = "participant",
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    comm = Communication(
        event_id=event_id,
        recipient_type=recipient_type,
        recipient_email=recipient_email,
        subject=subject,
        body=body,
        status="sent",
    )
    db.add(comm)
    await log_action(
        db=db,
        event_id=event_id,
        action_type="Email",
        action=f"Email sent to {recipient_email}: {subject}",
        actor="Notification Engine",
        meta={"recipient_type": recipient_type}
    )
    await db.commit()
    await db.refresh(comm)
    return comm