from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
import uuid

from app.db.session import get_db
from app.models.participant import Participant
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.event import Event
from app.models.stage import Stage
from app.models.finalized_team import FinalizedTeam

router = APIRouter()

@router.get("/participant_dashboard")
async def get_participant_dashboard(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    # 1. Participant
    participant = (await db.execute(
        select(Participant).where(Participant.id == participant_id)
    )).scalar_one_or_none()

    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    # 2. Event + Stages (single pass each)
    event = (await db.execute(
        select(Event).where(Event.id == event_id)
    )).scalar_one_or_none()

    stages = (await db.execute(
        select(Stage)
        .where(
                Stage.event_id == event_id,
                Stage.is_committee_visible == False
            )
        .order_by(Stage.sequence_order)
    )).scalars().all()

    total_stages = len(stages)

    # 3. Resolve the active stage (mirrors journey endpoint logic)
    active_stage = next(
        (s for s in stages if s.status == "active"),
        None
    )

    # Fallback: match event.current_stage by name if no stage is marked active 
    if active_stage is None and event and event.current_participant_stage:
        active_stage = next(
            (s for s in stages if s.name and s.name.lower() == event.current_participant_stage.lower()),
            None
        )

    current_stage_name = active_stage.name if active_stage else "Team Formation in progress"
    current_stage_number = active_stage.sequence_order if active_stage else 0
    current_stage_status = active_stage.status if active_stage else "awaiting_approval"

    # Pull time_remaining from the stage model if the field exists, else omit/default
    current_stage_time_remaining = getattr(active_stage, "time_remaining", None)

    # 4. Team + Members — all from FinalizedTeam directly
    finalized_team = None
    members_list = []

    finalized_team_result = await db.execute(
        select(FinalizedTeam)
        .where(
            FinalizedTeam.event_id == event_id,
            FinalizedTeam.team_id == (
                select(TeamMember.team_id)
                .where(TeamMember.participant_id == participant_id)
                .scalar_subquery()
            )
        )
    )
    finalized_team = finalized_team_result.scalar_one_or_none()

    if finalized_team and finalized_team.members_snapshot:
        for member in finalized_team.members_snapshot:
            members_list.append({
                "name": member.get("name", ""),
                "email": member.get("email", ""),
                "institution": member.get("institution", ""),
                "skills": member.get("skill_tags") or member.get("skills") or [],
                "is_self": member.get("id") == str(participant_id)
            })

    return {
        # 💡 SOLUTION: Map Event ID to the root of the JSON response
        "event_id": str(event_id),
        
        "profile": {
            "name": f"{participant.first_name} {participant.last_name}",
            "email": participant.email,
            "phone": participant.phone,
            "institution": participant.institution,
            "domain": participant.domain or "General",
            "avatar_initials": (
                participant.avatar_initials
                if participant.avatar_initials not in [None, ""]
                else (
                        (participant.first_name[0] if participant.first_name else "") +
                        (participant.last_name[0] if participant.last_name else "")
                ).upper()
            ),
            "qualification_status": participant.qualification_status or "pending",
            "current_stage": current_stage_name,
            "total_stages": total_stages,
            "skill_tags": participant.skill_tags or [],
            "experience_level": participant.experience_level or "beginner",
        },
        "team": {
            "team_id": str(finalized_team.team_id) if finalized_team else None,
            # 💡 SOLUTION: Map Event ID directly into the Team object
            "event_id": str(finalized_team.event_id) if finalized_team else str(event_id),
            "team_name": finalized_team.name if finalized_team else None,
            "score": float(finalized_team.final_calculated_total) if finalized_team and finalized_team.final_calculated_total else None,
            "challenge": finalized_team.challenge if finalized_team else None,
            "mentor_name": getattr(finalized_team, "mentor_name", None),
            "mentor_company": getattr(finalized_team, "mentor_company", None),
            "mentor_email": getattr(finalized_team, "mentor_email", None),
            "next_session_datetime": (
                finalized_team.next_session_datetime.isoformat()
                if getattr(finalized_team, "next_session_datetime", None)
                else None
            ),
            "members": members_list,
        },
        "current_stage": {
            "number": current_stage_number,
            "name": current_stage_name,
            "total_stages": total_stages,
            "status": current_stage_status,
            "time_remaining": current_stage_time_remaining,
        },
        "submissions_due": 2,
        "deadlines": [
            {"title": "Code + PPT submission", "due": "Today - 11:59 PM", "status": "urgent"},
            {"title": "Demo video upload", "due": "Tomorrow - 10 AM", "status": "pending"},
        ],
        "announcements": [
            {
                "type": "urgent",
                "title": "Evaluation window open",
                "body": "Judges are actively reviewing all submissions. Results expected by 6 PM today.",
                "time_ago": "2h ago",
            }
        ],
        "stages": [
            {
                "label": stage.name,
                "status": stage.status,           # real status: pending/active/awaiting_approval/complete
                "sequence_order": stage.sequence_order,
            }
            for stage in stages
        ],
    }