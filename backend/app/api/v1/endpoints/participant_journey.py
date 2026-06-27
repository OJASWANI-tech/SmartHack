from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.db.session import get_db
from app.models.stage import Stage
from app.models.event import Event
from app.models.team import Team
from app.models.team_member import TeamMember

router = APIRouter()

@router.get("/journey")
async def get_journey(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    # 1. Get all stages for the event in order
    stages = (await db.execute(
        select(Stage)
        .where(
                Stage.event_id == event_id,
                Stage.is_committee_visible == False
            )
        .order_by(Stage.sequence_order)
    )).scalars().all()

    if not stages:
        raise HTTPException(status_code=404, detail="No stages found for this event")

    # 2. Get current event
    event = (await db.execute(
        select(Event).where(Event.id == event_id)
    )).scalar_one_or_none()

    # 3. Get team score (only available after evaluation stage)
    team = (await db.execute(
        select(Team)
        .join(TeamMember, Team.id == TeamMember.team_id)
        .where(TeamMember.participant_id == participant_id)
    )).scalar_one_or_none()

    # 4. Build stage list
    stage_list = []
    for stage in stages:
        stage_list.append({
            "id": str(stage.id),
            "name": stage.name,
            "description": stage.description,
            "sequence_order": stage.sequence_order, 
            "status": stage.status,                        # pending/active/awaiting_approval/complete
            "started_at": stage.started_at.isoformat() if stage.started_at else None,
            "completed_at": stage.completed_at.isoformat() if stage.completed_at else None,
            # Show score only on evaluation stage, only if complete
            "score": (
                float(team.final_score)
                if team and team.final_score and stage.name.lower() == "evaluation"
                else None
            )
        })

    # 5. Find current stage index for progress calculation
    current_index = next(
        (i for i, s in enumerate(stages) if s.status == "active"),
        None
    )

    return {
        "total_stages": len(stages),
        "current_stage_index": (
            current_index + 1
            if current_index is not None
            else 0
        ),
        "event_current_stage": (
            "Team Formation in progress"
            if event and event.current_participant_stage == "Event created"
            else (
                event.current_participant_stage
                if event
                else None
            )
        ),
        "stages": stage_list
    }