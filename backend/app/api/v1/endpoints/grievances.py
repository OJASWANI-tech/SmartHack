# app/api/v1/endpoints/grievances.py
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.limiter import limiter
from pydantic import BaseModel
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.grievance import Grievance
from app.models.participant import Participant
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.finalized_team import FinalizedTeam
from app.models.communication import Communication
from app.models.activity_log import ActivityLog
from app.services.activity_log import log_action

router = APIRouter()

# Schema definitions
class GrievanceCreate(BaseModel):
    participant_id: uuid.UUID
    category: str  # 'mentor_issue', 'team_conflict', 'other'
    detail: str

class GrievanceResolve(BaseModel):
    action: str  # 'resolve', 'reject', 'swap_mentor', 'remove_mentor'
    note: Optional[str] = ""

class EmailMentorRequest(BaseModel):
    subject: str
    body: str

# Helper standby mentors list for swap backup
STANDBY_MENTORS = [
    {"name": "Prof. Richard Feynman", "company": "Caltech", "email": "feynman@caltech.edu"},
    {"name": "Grace Hopper", "company": "US Navy", "email": "hopper@navy.mil"},
    {"name": "Alan Turing", "company": "Bletchley Park", "email": "turing@bletchley.org.uk"},
    {"name": "Dr. Katherine Johnson", "company": "NASA", "email": "katherine.johnson@nasa.gov"},
    {"name": "Steve Wozniak", "company": "Apple Corp", "email": "woz@apple.com"}
]

@router.post("/{event_id}/grievances")
@limiter.limit("5/minute")
async def create_grievance(
    request: Request,
    event_id: uuid.UUID,
    payload: GrievanceCreate,
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch Participant Name
    p_result = await db.execute(
        select(Participant).where(Participant.id == payload.participant_id)
    )
    participant = p_result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    participant_name = f"{participant.first_name} {participant.last_name}"

    # 2. Fetch Associated Team
    team_result = await db.execute(
        select(Team)
        .join(TeamMember, Team.id == TeamMember.team_id)
        .where(TeamMember.participant_id == payload.participant_id)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found for the participant. Roster assignment needed.")
    
    # 3. AI Severity Analyzer
    detail_lower = payload.detail.lower()
    high_severity_keywords = [
        "fighting", "conflict", "abusive", "unresponsive", "not responding", 
        "not working", "no code", "not contributing", "ignored", "ignore",
        "absent", "worst", "terrible", "useless", "quit", "stole"
    ]
    
    severity = "medium"
    if any(kw in detail_lower for kw in high_severity_keywords):
        severity = "high"
    elif len(detail_lower) < 20:
        severity = "low"

    # 4. Pre-draft AI Reply
    ai_draft = ""
    if payload.category == "mentor_issue":
        ai_draft = (
            f"The Committee has received your grievance regarding mentor support for {team.name}. "
            "We have flagged this for immediate review. If mentor unavailability is confirmed, "
            "we will automatically execute a supervisor swap to allocate another available mentor."
        )
    elif payload.category == "team_conflict":
        ai_draft = (
            f"We have logged the reports of work distribution and conflict in {team.name}. "
            "The committee has notified your assigned mentor to step in as a mediator to manage tasks and resolve conflicts."
        )
    else:
        ai_draft = (
            "Thank you for reaching out to the resolution portal. A committee supervisor "
            "has received your platform query and will respond directly with details."
        )

    # 5. Create Grievance
    grievance = Grievance(
        event_id=event_id,
        team_id=team.id,
        team_name=team.name,
        participant_id=payload.participant_id,
        participant_name=participant_name,
        category=payload.category,
        detail=payload.detail,
        severity=severity,
        status="pending",
        ai_drafted_reply=ai_draft,
        is_clicked=False
    )
    
    db.add(grievance)
    
    # Log Activity
    await log_action(
        db=db,
        event_id=event_id,
        action_type="Grievance",
        action=f"Submitted grievance ticket for Team {grievance.team_name}",
        actor="Committee Portal",
        meta=None
    )
    
    await db.commit()
    await db.refresh(grievance)
    
    return {
        "status": "success",
        "grievance_id": str(grievance.id),
        "severity": severity,
        "ai_drafted_reply": ai_draft
    }

@router.get("/{event_id}/grievances")
async def list_grievances(
    event_id: uuid.UUID,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Grievance).where(Grievance.event_id == event_id)
    if status_filter:
        stmt = stmt.where(Grievance.status == status_filter)
    stmt = stmt.order_by(Grievance.created_at.desc())
    
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    return records

@router.post("/{event_id}/grievances/{grievance_id}/resolve")
async def resolve_grievance(
    event_id: uuid.UUID,
    grievance_id: uuid.UUID,
    payload: GrievanceResolve,
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch Grievance
    g_result = await db.execute(
        select(Grievance).where(Grievance.id == grievance_id, Grievance.event_id == event_id)
    )
    grievance = g_result.scalar_one_or_none()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")

    action = payload.action
    status_val = "resolved" if action != "reject" else "rejected"
    
    # Update status and note
    grievance.status = status_val
    grievance.resolution_note = payload.note or f"Action {action} executed successfully by committee."
    grievance.updated_at = func.now()

    # 2. Process Actions
    if action == "swap_mentor":
        # Find candidate mentors to swap
        m_result = await db.execute(
            select(FinalizedTeam.mentor_name, FinalizedTeam.mentor_company, FinalizedTeam.mentor_email)
            .where(
                FinalizedTeam.event_id == event_id,
                FinalizedTeam.mentor_name != None,
                FinalizedTeam.id != grievance.team_id
            )
            .distinct()
        )
        candidates = m_result.all()
        
        # Pick a mentor
        new_mentor = None
        if candidates:
            # Let's pick the first candidate
            new_mentor = {
                "name": candidates[0][0],
                "company": candidates[0][1],
                "email": candidates[0][2]
            }
        else:
            # Standby fallback
            new_mentor = STANDBY_MENTORS[0]
        
        # Apply UPDATE to Team and FinalizedTeam
        await db.execute(
            update(Team)
            .where(Team.id == grievance.team_id)
            .values(
                mentor_name=new_mentor["name"],
                mentor_company=new_mentor["company"],
                mentor_email=new_mentor["email"]
            )
        )
        await db.execute(
            update(FinalizedTeam)
            .where(FinalizedTeam.team_id == grievance.team_id)
            .values(
                mentor_name=new_mentor["name"],
                mentor_company=new_mentor["company"],
                mentor_email=new_mentor["email"]
            )
        )
        
        # Log communication
        db.add(Communication(
            event_id=event_id,
            recipient_type="mentor",
            recipient_email=new_mentor["email"],
            subject=f"New Mentor Assignment - Team {grievance.team_name}",
            body=f"Hello {new_mentor['name']},\n\nYou have been re-assigned to Mentor Team {grievance.team_name}. Please coordinate session slots in your dashboard.\n\nBest,\nCommittee Hub",
            status="sent"
        ))
        
        # Log Activity
        await log_action(
            db=db,
            event_id=event_id,
            action_type="Grievance",
            action=f"Swapped mentor for Team {grievance.team_name} to {new_mentor['name']}",
            actor="Committee Portal",
            meta=None
        )

    elif action == "remove_mentor":
        # Clear mentor values
        await db.execute(
            update(Team)
            .where(Team.id == grievance.team_id)
            .values(mentor_name=None, mentor_company=None, mentor_email=None)
        )
        await db.execute(
            update(FinalizedTeam)
            .where(FinalizedTeam.team_id == grievance.team_id)
            .values(mentor_name=None, mentor_company=None, mentor_email=None)
        )
        
        # Log Activity
        await log_action(
            db=db,
            event_id=event_id,
            action_type="Grievance",
            action=f"Removed mentor from Team {grievance.team_name}",
            actor="Committee Portal",
            meta=None
        )

    elif action == "reject":
        # Log Activity
        await log_action(
            db=db,
            event_id=event_id,
            action_type="Grievance",
            action=f"Rejected grievance ticket for Team {grievance.team_name}",
            actor="Committee Portal",
            meta=None
        )

    else:
        # Default resolve
        action_text = f"Resolved grievance ticket for Team {grievance.team_name} with notice: {payload.note}"
        if len(action_text) > 255:
            action_text = action_text[:251] + "..."

        await log_action(
            db=db,
            event_id=event_id,
            action_type="Grievance",
            action=action_text,
            actor="Committee Portal",
            meta=None
        )
        
    await db.commit()
    return {"status": "success", "detail": f"Grievance resolved with action '{action}'"}

@router.post("/{event_id}/grievances/{grievance_id}/email-mentor")
async def email_mentor_warning(
    event_id: uuid.UUID,
    grievance_id: uuid.UUID,
    payload: EmailMentorRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch Grievance
    g_result = await db.execute(
        select(Grievance).where(Grievance.id == grievance_id, Grievance.event_id == event_id)
    )
    grievance = g_result.scalar_one_or_none()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")
        
    # 2. Fetch Team Mentor Details
    t_result = await db.execute(
        select(FinalizedTeam).where(FinalizedTeam.team_id == grievance.team_id)
    )
    f_team = t_result.scalar_one_or_none()
    
    mentor_email = f_team.mentor_email if f_team else None
    if not mentor_email:
        # Fallback to team table
        t_fallback = await db.execute(
            select(Team).where(Team.id == grievance.team_id)
        )
        fallback_team = t_fallback.scalar_one_or_none()
        mentor_email = fallback_team.mentor_email if fallback_team else None
        
    if not mentor_email:
        raise HTTPException(status_code=400, detail="No mentor email found for the associated team. Assign mentor first.")

    # 3. Log Communication
    comm = Communication(
        event_id=event_id,
        recipient_type="mentor",
        recipient_email=mentor_email,
        subject=payload.subject,
        body=payload.body,
        status="sent"
    )
    db.add(comm)
    
    # 4. Log Activity
    await log_action(
        db=db,
        event_id=event_id,
        action_type="Email",
        action=f"Grievance warning email sent to mentor {mentor_email} for Team {grievance.team_name}",
        actor="Committee Portal",
        meta=None
    )
    
    await db.commit()
    return {"status": "success", "detail": f"Warning email sent successfully to {mentor_email}"}

@router.post("/{event_id}/grievances/{grievance_id}/reopen")
async def reopen_grievance(
    event_id: uuid.UUID,
    grievance_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch Grievance
    g_result = await db.execute(
        select(Grievance).where(Grievance.id == grievance_id, Grievance.event_id == event_id)
    )
    grievance = g_result.scalar_one_or_none()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")
        
    grievance.status = "pending"
    grievance.updated_at = func.now()
    
    # Log Activity
    await log_action(
        db=db,
        event_id=event_id,
        action_type="Grievance",
        action=f"Grievance ticket reopened for Team {grievance.team_name}",
        actor="System Engine",
        meta=None
    )
    
    await db.commit()
    return {"status": "success", "detail": "Grievance reopened"}

@router.get("/{event_id}/grievances/unclicked-count")
async def get_unclicked_count(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(func.count(Grievance.id)).where(
        Grievance.event_id == event_id,
        Grievance.is_clicked == False
    )
    result = await db.execute(stmt)
    count = result.scalar() or 0
    return {"count": count}

@router.post("/{event_id}/grievances/mark-clicked")
async def mark_grievances_clicked(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        update(Grievance)
        .where(Grievance.event_id == event_id, Grievance.is_clicked == False)
        .values(is_clicked=True)
    )
    await db.commit()
    return {"status": "success"}

