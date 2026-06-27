import csv
import io
import math
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update  # 💡 NEW: Import direct update query execution tool
from app.db.session import get_db  
from ai_app.tasks.stage_tasks import activate_build_stage

from app.models.finalized_team import FinalizedTeam
from app.models.team import Team
from app.schemas.team import TeamRead, MentorAssignRequest 
from app.models.stage import Stage
from app.utils.stages_utils import activate_stage, complete_stage, create_system_announcement
from app.models.event import Event
from app.services.activity_log import log_action

router = APIRouter(prefix="/{event_id}", tags=["Mentor Allocation Pipeline"])

@router.get("/finalized-teams", response_model=List[TeamRead])
async def get_finalized_teams(event_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(FinalizedTeam).where(FinalizedTeam.event_id == event_id)
    result = await db.execute(stmt)
    teams = result.scalars().all()
    return teams


@router.post("/upload-mentors-csv")
async def upload_and_allocate_mentors(
    event_id: UUID, 
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    """
    Reads the CSV stream and allocates mentors using direct bulk database UPDATE statements.
    """
    # 1. Fetch only the IDs of the finalized teams
    stmt = select(FinalizedTeam.id).where(FinalizedTeam.event_id == event_id)
    result = await db.execute(stmt)
    team_ids = result.scalars().all()
    
    if not team_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No finalized teams found for this event."
        )

    # 2. Parse the CSV file stream
    try:
        contents = await file.read()
        buffer = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(buffer)
        
        mentors_pool = []
        for row in reader:
            name = row.get("name") or row.get("Mentor Name") or row.get("Mentor") or ""
            company = row.get("company") or row.get("Company") or row.get("Organization") or ""
            email = row.get("email") or row.get("Email") or row.get("Mentor Email") or ""
            
            if name.strip():
                mentors_pool.append({
                    "name": name.strip(),
                    "company": company.strip(),
                    "email": email.strip()
                })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse mentor CSV layout: {str(e)}"
        )

    if not mentors_pool:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded mentor CSV file contains no valid records."
        )

    total_teams = len(team_ids)
    total_mentors = len(mentors_pool)

    # 3. Direct SQL Execution Update Loop
    for idx, target_team_id in enumerate(team_ids):
        assigned_mentor = mentors_pool[idx % total_mentors]
        
        # Fetch the original team_id
        db_team_id = (await db.execute(
            select(FinalizedTeam.team_id).where(FinalizedTeam.id == target_team_id)
        )).scalar_one_or_none()
        
        update_stmt = (
            update(FinalizedTeam)
            .where(FinalizedTeam.id == target_team_id)
            .values(
                mentor_name=assigned_mentor["name"],
                mentor_company=assigned_mentor["company"],
                mentor_email=assigned_mentor["email"]
            )
        )
        await db.execute(update_stmt)

        if db_team_id:
            team_update_stmt = (
                update(Team)
                .where(Team.id == db_team_id)
                .values(
                    mentor_name=assigned_mentor["name"],
                    mentor_company=assigned_mentor["company"],
                    mentor_email=assigned_mentor["email"]
                )
            )
            await db.execute(team_update_stmt)

    

    await log_action(
        db=db,
        event_id=event_id,
        action_type="System",
        action=f"Mentors allocated to {total_teams} finalized teams",
        actor="Admin Portal",
        meta={"mentors_count": total_mentors, "teams_count": total_teams}
    )
    
    # 4. Flush and commit the changes permanently
    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully distributed {total_mentors} mentors across {total_teams} finalized teams.",
        "distribution_ratio": f"Maximum of {math.ceil(total_teams / total_mentors)} teams per mentor."
    }


@router.post("/teams/{team_id}/assign-mentor", response_model=TeamRead)
async def manual_mentor_override(
    event_id: UUID,
    team_id: UUID,
    payload: MentorAssignRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Handles manual dropdown supervisor updates using a direct SQL update strategy.
    """
    # 💡 FIX: Apply direct update execution strategy to manual assignments as well
    # Fetch original team_id
    db_team_id = (await db.execute(
        select(FinalizedTeam.team_id).where(FinalizedTeam.id == team_id)
    )).scalar_one_or_none()

    update_stmt = (
        update(FinalizedTeam)
        .where(FinalizedTeam.id == team_id, FinalizedTeam.event_id == event_id)
        .values(
            mentor_name=payload.mentor_name,
            mentor_company=payload.mentor_company,
            mentor_email=payload.mentor_email
        )
    )


    await db.execute(update_stmt)

    if db_team_id:
        team_update_stmt = (
            update(Team)
            .where(Team.id == db_team_id)
            .values(
                mentor_name=payload.mentor_name,
                mentor_company=payload.mentor_company,
                mentor_email=payload.mentor_email
            )
        )
        await db.execute(team_update_stmt)

    await db.commit()

    # Re-fetch the clean record row to return back to your frontend layout view
    stmt = select(FinalizedTeam).where(FinalizedTeam.id == team_id)
    result = await db.execute(stmt)
    team = result.scalar_one_or_none()
    return team


@router.post("/stages/mentors/finalize")
async def finalize_mentor_allocations(event_id: UUID, db: AsyncSession = Depends(get_db)):

    
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    # COMPLETE CURRENT Mentor Assignment STAGE for committee
    current_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 4,
            Stage.is_committee_visible == True
        )
    )
    current_stage = current_stage_result.scalar_one_or_none()

    if current_stage:
        complete_stage(current_stage)

    # ACTIVATE Build Phase STAGE for committee
    next_c_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 5,
            Stage.is_committee_visible == True
        )
    )
    next_c_stage = next_c_stage_result.scalar_one_or_none()

    if next_c_stage:
        activate_stage(next_c_stage)
        event.current_committee_stage = next_c_stage.name

    
    
    # COMPLETE Team Connect STAGE for participant
    current_p_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 1,
            Stage.is_committee_visible == False
        )
    )
    current_p_stage = current_p_stage_result.scalar_one_or_none()

    if current_p_stage:
        complete_stage(current_p_stage)

        await create_system_announcement(
            db=db,
            event_id=event_id,
            title="Team Connect Completed ✅",
            message=f" Hope you interacted with your team well. Get ready for the next stage.",
            type="info"
        )

    # ACTIVATE Mentor Connect STAGE for participant
    next_p_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 2,
            Stage.is_committee_visible == False
        )
    )
    next_p_stage = next_p_stage_result.scalar_one_or_none()

    if next_p_stage:
        activate_stage(next_p_stage)
        event.current_participant_stage = next_p_stage.name

        await create_system_announcement(
            db=db,
            event_id=event_id,
            title="Mentor Assigned 🎯",
            message=f" A mentor has been assigned to your team. Reach out and start discussing your project ideas.",
            type="info"
        )

    await log_action(
        db=db,
        event_id=event_id,
        action_type="System",
        action="Mentor allocations finalized, Build Phase activated",
        actor="Admin Portal",
        meta=None
    )
    
    await db.commit()

    # after await db.commit() inside finalize_mentor_allocations:
    activate_build_stage.apply_async(
        args=[str(event_id)],
        countdown=60,                        # 24 hours
        task_id=f"build_stage_{event_id}",      # prevents duplicates
    )

    return {"status": "success", "detail": "Mentor allocations locked successfully."}