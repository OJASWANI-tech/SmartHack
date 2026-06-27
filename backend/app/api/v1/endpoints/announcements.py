import uuid
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.models.event import Event
from app.models.stage import Stage
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.participant import Participant
from app.models.approval_gate import ApprovalGate
from app.schemas.common import MessageResponse
from app.utils.stages_utils import activate_stage, complete_stage
from ai_app.tasks.llm_tasks import send_individual_welcome_email
from app.services.activity_log import log_action

router = APIRouter()

# =====================================================================
# ANNOUNCEMENT GATE: QUEUE PREVIEW (does NOT send emails yet)
# =====================================================================
@router.post("/{event_id}/announce-teams", response_model=MessageResponse)
async def announce_teams(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 1 of 2: Builds the email payload preview for every approved participant
    and creates an announcement approval gate. Emails are NOT sent yet.
    """
    # Guard 1: Require all teams to be explicitly approved before moving forward
    unresolved_query = await db.execute(
        select(Team).where(
            Team.event_id == event_id,
            Team.approval_status != "approved",
        )
    )
    if unresolved_query.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="All teams must be fully approved via the dashboard cards before initializing announcements.",
        )

    # Guard 2: Don't create a duplicate gate if one already exists
    existing_gate = await db.execute(
        select(ApprovalGate).where(
            ApprovalGate.event_id == event_id,
            ApprovalGate.gate_type == "announcement",
        )
    )
    if existing_gate.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Announcement gate already exists. Use /approve-announcement to finalize.",
        )

    # 🚀 OPTIMIZATION: Count participants using a single database join query instead of a loop
    count_query = await db.execute(
        select(Participant)
        .join(TeamMember, Participant.id == TeamMember.participant_id)
        .join(Team, TeamMember.team_id == Team.id)
        .where(Team.event_id == event_id)
    )
    total_participants = len(count_query.scalars().all())

    # Create the operational gate tracking row
    new_gate = ApprovalGate(
        event_id=event_id,
        gate_type="announcement",
        status="pending",
        action_payload={"participant_count": total_participants},
    )
    db.add(new_gate)
    await db.commit()

    return {
        "message": "Announcement gate created successfully. Review payload parameters and invoke approval step.",
        "detail": f"{total_participants} participants are securely queued for notification delivery pipelines."
    }


# =====================================================================
# ANNOUNCEMENT GATE: APPROVE → SEND EMAILS + ADVANCE STAGE
# =====================================================================
@router.post("/{event_id}/approve-announcement", response_model=MessageResponse)
async def approve_announcement(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 2 of 2: Approves the announcement gate, dispatches parallel asynchronous Celery tasks,
    completes Stage 3 ("Team Announcement"), and opens up Stage 4 ("Evaluation").
    """
    # 1. Fetch Event and Gate parameters
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Target event workspace container not found.")

    gate_result = await db.execute(
        select(ApprovalGate)
        .where(ApprovalGate.event_id == event_id, ApprovalGate.gate_type == "announcement")
        .order_by(desc(ApprovalGate.created_at))
    )
    gate = gate_result.scalars().first()

    if not gate:
        raise HTTPException(
            status_code=404,
            detail="No matching active announcement gate found. Run /announce-teams setup first.",
        )
    if gate.status == "approved":
        raise HTTPException(status_code=400, detail="Notification payload tracking histories are already complete.")
    if gate.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot process an approval cycle on a gate with status: {gate.status}",
        )

    # 2. Fetch records using clean inner joins
    result = await db.execute(
        select(Participant, Team)
        .join(TeamMember, Participant.id == TeamMember.participant_id)
        .join(Team, TeamMember.team_id == Team.id)
        .where(Participant.event_id == event_id)
    )
    records = result.all()

    if not records:
        raise HTTPException(status_code=404, detail="No assigned participant matrices discovered for this workspace.")

    # 3. Map out team rosters in-memory
    team_roster = defaultdict(list)
    for participant, team in records:
        team_roster[team.id].append({
            "name": f"{participant.first_name} {participant.last_name or ''}".strip(),
            "email": participant.email
        })

    # 4. Dispatch tasks cleanly via Celery
    email_count = 0
    for participant, team in records:
        display_rationale = team.llm_rationale or "Your unique combination of skills is perfect for this challenge track!"

        # Isolate peers on the team (excluding the recipient)
        teammates = [
            f"{member['name']} ({member['email']})"
            for member in team_roster[team.id]
            if member['email'] != participant.email
        ]
        teammates_list_str = ", ".join(teammates) if teammates else "Assigning remaining teammates soon!"

        send_individual_welcome_email.apply_async(
            kwargs={
                "event_id": str(event_id),
                "recipient_name": f"{participant.first_name} {participant.last_name or ''}".strip(),
                "recipient_email": participant.email,
                "first_name": participant.first_name,
                "team_name": team.name,
                "rationale": display_rationale,
                "teammates": teammates_list_str,
                "custom_subject": f"🚀 [{participant.first_name}] Congratulations! Shortlisted for Round 2 - WiSE@TI Hackathon",
                "custom_body": "",
            },
            queue="llm_queue"
        )
        email_count += 1

    # 5. Commit state mutations to the database
    gate.status = "approved"


    await log_action(
        db=db,
        event_id=event_id,
        action_type="Email",
        action=f"Welcome and team assignment emails dispatched to {email_count} participants",
        actor="Notification Engine",
        meta={"email_count": email_count}
    )
    await db.commit()

    return {
        "message": "Successfully approved announcement configurations.",
        "detail": f"Queued {email_count} participant messages across parallel worker processing environments."
    }