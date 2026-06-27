from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.participant import Participant
from app.models.stage import Stage
from app.models.event import Event
from app.schemas.participant import ParticipantRead
from app.schemas.common import MessageResponse
from app.utils.stages_utils import activate_stage, complete_stage
from typing import List
import uuid
import csv
import io
from app.services.activity_log import log_action


router = APIRouter()


@router.post("/{event_id}/upload-csv", response_model=MessageResponse)
async def upload_participants_csv(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Confirm Event Context is real before processing file context
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    contents = await file.read()
    try:
        decoded = contents.decode("utf-8")
    except UnicodeDecodeError:
        decoded = contents.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))

    added = 0
    skipped = 0

    # Pre-load existing emails to catch duplicates against DB (case-insensitive)
    existing_result = await db.execute(
        select(Participant.email).where(Participant.event_id == event_id)
    )
    existing_emails = set(email.lower() for email in existing_result.scalars().all())

    for row in reader:
        email = row.get("email", "").strip().lower()
        if not email or "@" not in email:
            skipped += 1
            continue

        # Skip emails already in DB or already seen in this CSV batch
        if email in existing_emails:
            skipped += 1
            continue

        skill_tags_raw = row.get("skill_tags", "")
        skill_tags = [s.strip() for s in skill_tags_raw.split(",") if s.strip()]

        # Standardize experience level — DB constraint requires lowercase values
        raw_level = row.get("experience_level", "").strip().lower()
        if raw_level not in ["beginner", "intermediate", "advanced"]:
            raw_level = "intermediate"
        experience_level = raw_level

        participant = Participant(
            event_id=event_id,
            first_name=row.get("first_name", "").strip(),
            last_name=row.get("last_name", "").strip(),
            email=email,
            phone=row.get("phone", "").strip() or None,
            institution=row.get("institution", "").strip() or None,
            skill_tags=skill_tags,
            experience_level=experience_level,
            domain=row.get("domain", "").strip().lower() or None,
        )
        db.add(participant)
        existing_emails.add(email)
        added += 1

    await db.commit()

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Database",
        action="CSV Roster verified and parsed into staging records",
        actor="System Engine",
        meta=None
    )

    # Mark Participant Intake as completed for committee
    stage_c_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 1,
            Stage.is_committee_visible == True
        )
    )
    current_c_stage = stage_c_result.scalar_one_or_none()
    if current_c_stage and current_c_stage.status != "completed":
        complete_stage(current_c_stage)

    # Activate next stage for committee
    next_c_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 2,
            Stage.is_committee_visible == True
        )
    )
    next_c_stage = next_c_stage_result.scalar_one_or_none()
    if next_c_stage and next_c_stage.status == "upcoming":
        activate_stage(next_c_stage)
        event.current_committee_stage = next_c_stage.name

    await db.commit()

    return {"message": f"{added} participants added, {skipped} skipped"}


@router.get("/{event_id}/participants", response_model=List[ParticipantRead])
async def list_participants(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Participant)
        .where(Participant.event_id == event_id)
        .order_by(Participant.created_at)
    )
    return result.scalars().all()


@router.get("/{event_id}/participants/{participant_id}", response_model=ParticipantRead)
async def get_participant(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Participant).where(
            Participant.id == participant_id,
            Participant.event_id == event_id,
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    return p


@router.post("/{event_id}/reset-workspace", response_model=MessageResponse)
async def reset_workspace(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    # Confirm Event Context is real before resetting
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    from app.models.score import Score
    from app.models.score_anomaly import ScoreAnomaly
    from app.models.finalized_team import FinalizedTeam
    from app.models.team_member import TeamMember
    from app.models.team import Team
    from app.models.evaluator import Evaluator
    from app.models.participant import Participant
    from app.models.stage import Stage
    from app.models.evaluation_schedule import EvaluationSchedule
    from app.models.ai_insight import AIInsight
    from app.models.evaluator_assignment import EvaluatorAssignment
    from sqlalchemy import delete, func

    # 1. Fetch team IDs
    team_ids_res = await db.execute(select(Team.id).where(Team.event_id == event_id))
    team_ids = team_ids_res.scalars().all()

    if team_ids:
        # Delete scores
        await db.execute(delete(Score).where(Score.team_id.in_(team_ids)))
        # Delete team members
        await db.execute(delete(TeamMember).where(TeamMember.team_id.in_(team_ids)))

    # Delete anomalies, finalized teams, teams, schedules, insights, evaluators, participants, assignments
    await db.execute(delete(ScoreAnomaly).where(ScoreAnomaly.event_id == event_id))
    await db.execute(delete(FinalizedTeam).where(FinalizedTeam.event_id == event_id))
    await db.execute(delete(Team).where(Team.event_id == event_id))
    await db.execute(delete(EvaluationSchedule).where(EvaluationSchedule.event_id == event_id))
    await db.execute(delete(AIInsight).where(AIInsight.event_id == event_id))
    await db.execute(delete(Evaluator).where(Evaluator.event_id == event_id))
    await db.execute(delete(Participant).where(Participant.event_id == event_id))
    await db.execute(delete(EvaluatorAssignment).where(EvaluatorAssignment.event_id == event_id))

    # 2. Reset stages
    stages_res = await db.execute(select(Stage).where(Stage.event_id == event_id))
    stages = stages_res.scalars().all()
    for stage in stages:
        if stage.sequence_order in [1, 8]:
            stage.status = "active"
            stage.started_at = func.now()
            stage.completed_at = None
        else:
            stage.status = "upcoming"
            stage.started_at = None
            stage.completed_at = None

    # Reset event current committee stage
    event.current_committee_stage = "Participant Intake"

    await db.commit()
    return {"message": "Workspace successfully reset. All participants, teams, evaluators, and scores cleared."}