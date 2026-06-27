import asyncio
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anyio import to_thread

from app.db.session import get_db
from app.models.finalized_team import FinalizedTeam
from app.models.delivery_log import DeliveryLog
from app.models.event import Event  # 🚀 FIX: Added missing Event import to resolve NameError
from app.schemas.common import MessageResponse
from app.core.dependencies import get_current_committee_member

# Import the task once at the file root level
from ai_app.tasks.llm_tasks import send_individual_welcome_email

router = APIRouter()

class AnnouncementPayload(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None


# =====================================================================
# 🚀 ROUTE 1: DISPATCH ANNOUNCEMENTS TO CELERY QUEUES
# =====================================================================
@router.post("/{event_id}/send-announcements", response_model=MessageResponse)
async def send_announcements(
    event_id: uuid.UUID, 
    payload: AnnouncementPayload,  
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    Queries finalized team rosters, pulls member snapshots, and schedules parallel
    custom email communications through Celery task distribution pipelines.
    """
    # 1. Pull the real records currently residing inside the database
    result = await db.execute(
        select(FinalizedTeam).where(FinalizedTeam.event_id == event_id)
    )
    finalized_teams = result.scalars().all()

    if not finalized_teams:
        raise HTTPException(
            status_code=404, 
            detail="No finalized/approved team records found. Please approve the stage first!"
        )

    email_count = 0

    # 2. Iterate dynamically over the active dataset records
    for final_team in finalized_teams:
        members = final_team.members_snapshot  # Clean list of dictionaries directly from DB
        rationale_text = final_team.llm_rationale or "Your unique configuration of skills sets your team up for success!"

        for current_member in members:
            # Look up teammates using the live database snapshot array lists
            teammates = [
                f"{m['name']} ({m['email']})"
                for m in members
                if m['email'] != current_member['email']
            ]
            teammates_list_str = ", ".join(teammates) if teammates else "Your remaining teammates are being assigned shortly!"
            
            first_name = current_member['name'].split()[0]

            # Use frontend edits or fallback onto defaults
            custom_subject = payload.subject if payload.subject else f"🚀 [{first_name}] Congratulations! Shortlisted for Round 2"
            custom_body = payload.body if payload.body else ""

            # Pass data configurations down to Celery asynchronously without blocking the main event loop
            await to_thread.run_sync(
                lambda m_email=current_member['email'], m_name=current_member['name'], f_name=first_name: 
                send_individual_welcome_email.apply_async(
                    kwargs={
                        "event_id": str(event_id),                                  
                        "recipient_name": m_name,    
                        "recipient_email": m_email,  
                        "first_name": f_name,
                        "team_name": final_team.name,
                        "rationale": rationale_text,
                        "teammates": teammates_list_str,
                        "custom_subject": custom_subject,
                        "custom_body": custom_body  
                    },
                    queue="llm_queue"
                )
            )
            email_count += 1
            
            # Prevent connection flooding drops every 5 tasks
            if email_count % 5 == 0:
                await asyncio.sleep(0.1)

    return {
        "message": f"Successfully processed deliveries. Dispatched {email_count} sandbox simulations directly from live database snapshot records.",
        "detail": "Celery workers are routing testing variants directly to your admin sandbox inbox."
    }


# =====================================================================
# 📊 ROUTE 2: FETCH REAL-TIME LOGS FOR THE DASHBOARD LOG GRID
# =====================================================================
@router.get("/{event_id}/delivery-logs")
async def get_delivery_logs(
    event_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches real-time delivery tracking records for a specific event 
    to populate the frontend dashboard log grid component dynamically.
    """
    # 🌟 VALIDATION GUARD: Safely executed now that 'Event' is defined
    event_exists = (await db.execute(
        select(Event.id).where(Event.id == event_id)
    )).scalar_one_or_none()

    if not event_exists:
        raise HTTPException(
            status_code=404, 
            detail="Dashboard request rejected: The targeted event context does not exist."
        )

    # 1. Query the database for logs matching this event ID, sorted newest first
    result = await db.execute(
        select(DeliveryLog)
        .where(DeliveryLog.event_id == event_id)
        .order_by(DeliveryLog.sent_at.desc())
    )
    logs = result.scalars().all()
    
    # 2. Return a clean list payload matching the exact keys your React UI table expects
    return [
        {
            "name": log.recipient_name,
            "email": log.recipient_email,
            "stage": log.stage,
            "status": log.status,
            "sentAt": log.sent_at.strftime("%I:%M %p") if log.sent_at else "Pending", 
            "opened": log.opened
        }
        for log in logs
    ]