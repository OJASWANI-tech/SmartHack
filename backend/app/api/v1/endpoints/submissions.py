from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid
import logging

from app.db.session import get_db
from app.models.submission import Submission
from app.models.stage import Stage
from app.models.team_member import TeamMember
from app.models.event import Event  # 🌟 Added Event model import for validation checks

from app.utils.stages_utils import activate_stage, complete_stage, create_system_announcement
from app.services.activity_log import log_action

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


# ── Pydantic Models ────────────────────────────────────────────

class SubmissionUpload(BaseModel):
    event_id:       uuid.UUID
    stage_id:       uuid.UUID
    participant_id: uuid.UUID
    ppt_url:        Optional[str] = None
    demo_video_url: Optional[str] = None
    notes:          Optional[str] = None


class GithubUpdate(BaseModel):
    participant_id: uuid.UUID
    stage_id:       Optional[uuid.UUID] = None
    github_url:     str


# ── Helper: get team and submission ───────────────────────────

async def get_team_and_submission(participant_id: uuid.UUID, db: AsyncSession):
    team_member = (await db.execute(
        select(TeamMember).where(TeamMember.participant_id == participant_id)
    )).scalar_one_or_none()

    if not team_member:
        raise HTTPException(status_code=404, detail="Team not found for participant")

    submission = (await db.execute(
        select(Submission)
        .where(Submission.team_id == team_member.team_id)
        .order_by(Submission.submitted_at.desc())
    )).scalar_one_or_none()

    return team_member, submission


# ── GET: fetch team's submissions ──────────────────────────────

@router.get("/submissions")
async def get_submissions(
    event_id:       uuid.UUID,
    participant_id: uuid.UUID,
    db:              AsyncSession = Depends(get_db)
):
    team_member, _ = await get_team_and_submission(participant_id, db)

    submissions = (await db.execute(
        select(Submission)
        .where(Submission.team_id == team_member.team_id)
        .order_by(Submission.submitted_at.desc())
    )).scalars().all()

    return {
        "team_id": str(team_member.team_id),
        "submissions": [
            {
                "id":               str(s.id),
                "stage_id":         str(s.stage_id),
                "ppt_url":          s.ppt_url,
                "github_url":       s.github_url,
                "demo_video_url":   s.demo_video_url,
                "notes":            s.notes,
                "status":           s.status,
                "ppt_submitted":    s.ppt_url is not None,
                "github_submitted": s.github_url is not None,
                "video_submitted":  s.demo_video_url is not None,
                "submitted_at":     s.submitted_at.isoformat() if s.submitted_at else None,
            }
            for s in submissions
        ]
    }


# ── POST: create row + upload PPT and video links ──────────────

@router.post("/submissions/upload")
async def upload_submission(
    payload: SubmissionUpload,
    db:      AsyncSession = Depends(get_db)
):
    print("\n" + "="*50, flush=True)
    print("🚀 [BACKEND] RECEIVED SUBMISSION UPLOAD REQUEST:", flush=True)
    print(f"   • Event ID:       {payload.event_id}", flush=True)
    print(f"   • Stage ID:       {payload.stage_id}", flush=True)
    print(f"   • Participant ID: {payload.participant_id}", flush=True)
    print(f"   • PPT URL:        {payload.ppt_url}", flush=True)
    print(f"   • Demo Video URL: {payload.demo_video_url}", flush=True)
    print(f"   • Notes:          {payload.notes}", flush=True)
    print("="*50 + "\n", flush=True)

    # 🌟 VALIDATION GUARD: Check if the event timeline allows submissions
    event = (await db.execute(
        select(Event).where(Event.id == payload.event_id)
    )).scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Associated event layout config not found")

    if not event.is_submission_open:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Submission rejected: The submission phase window is currently closed or has ended."
        )

    # Validate stage exists
    stage = (await db.execute(
        select(Stage).where(Stage.id == payload.stage_id)
    )).scalar_one_or_none()

    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    # Get team
    team_member = (await db.execute(
        select(TeamMember).where(TeamMember.participant_id == payload.participant_id)
    )).scalar_one_or_none()

    if not team_member:
        raise HTTPException(status_code=404, detail="Team not found for participant")

    # Check if submission already exists for this team + stage
    existing = (await db.execute(
        select(Submission).where(
            Submission.team_id == team_member.team_id,
            Submission.stage_id == payload.stage_id
        )
    )).scalar_one_or_none()

    if existing:
        # Resubmission — update ppt and video only
        existing.ppt_url        = payload.ppt_url or existing.ppt_url
        existing.demo_video_url = payload.demo_video_url or existing.demo_video_url
        existing.notes          = payload.notes or existing.notes
        existing.participant_id = payload.participant_id
        await db.commit()
        await db.refresh(existing)
        return {
            "message":        "Submission updated",
            "id":             str(existing.id),
            "ppt_url":        existing.ppt_url,
            "demo_video_url": existing.demo_video_url,
        }

    # Create new submission row with ppt + video
    submission = Submission(
        event_id=       payload.event_id,
        stage_id=       payload.stage_id,
        team_id=        team_member.team_id,
        participant_id= payload.participant_id,
        ppt_url=        payload.ppt_url,
        demo_video_url= payload.demo_video_url,
        notes=          payload.notes,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    return {
        "message":        "Submission created",
        "id":             str(submission.id),
        "ppt_url":        submission.ppt_url,
        "demo_video_url": submission.demo_video_url,
    }


# ── PUT: update GitHub URL ─────────────────────────────────────

@router.put("/submissions/github")
async def update_github_url(
    payload: GithubUpdate,
    db:      AsyncSession = Depends(get_db)
):
    print("\n" + "="*50, flush=True)
    print("🐙 [BACKEND] RECEIVED GITHUB URL UPDATE REQUEST:", flush=True)
    print(f"   • Participant ID: {payload.participant_id}", flush=True)
    print(f"   • GitHub URL:     {payload.github_url}", flush=True)
    print("="*50 + "\n", flush=True)

    team_member, submission = await get_team_and_submission(payload.participant_id, db)

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="No submission found. Submit PPT/video first."
        )

    # 🌟 VALIDATION GUARD: Verify submissions are still open before altering Github metadata repositories
    event = (await db.execute(
        select(Event).where(Event.id == submission.event_id)
    )).scalar_one_or_none()

    if not event or not event.is_submission_open:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Update rejected: The submission phase window is currently closed or has ended."
        )

    submission.github_url = payload.github_url
    await db.commit()
    await db.refresh(submission)

    return {
        "message":    "GitHub URL updated successfully",
        "github_url": submission.github_url
    }

# ── POST: Toggle submission phase globally for an event ───────

@router.post("/events/{event_id}/toggle-submission")
async def toggle_submission_phase(
    event_id: uuid.UUID, 
    is_open: bool, 
    db: AsyncSession = Depends(get_db)
):
    """
    Explicitly open or close the submission phase window for a target event.
    Targeted by frontend at: /api/v1/events/{event_id}/toggle-submission?is_open=true/false
    """
    # 1. Look up the existing event layout
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Target event context record not found."
        )

    # 2. Mutate the schema property tracking phase states
    event.is_submission_open = is_open

    if is_open:

        # COMPLETE build phase stage for participant
        build_stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 3, 
                Stage.is_committee_visible == False
            )
        )
        build_stage = build_stage_result.scalar_one_or_none()
        if build_stage:
            complete_stage(build_stage)

        # ACTIVATE submission stage for participant
        current_p_stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 4, 
                Stage.is_committee_visible == False
            )
        )
        current_p_stage = current_p_stage_result.scalar_one_or_none()

        if current_p_stage:
            activate_stage(current_p_stage)
            event.current_participant_stage = current_p_stage.name

            await create_system_announcement(
                db=db,
                event_id=event_id,
                title="Submission Portal Open 📤",
                message=f"The submission window is now open. Upload your project before the deadline.",
                type="info"
            )

    else:
        # COMPLETE submission stage for participant
        submission_stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 4,        # same stage
                Stage.is_committee_visible == False
            )
        )
        submission_stage = submission_stage_result.scalar_one_or_none()
        if submission_stage:
            complete_stage(submission_stage)

            await create_system_announcement(
                db=db,
                event_id=event_id,
                title="Submission Successful ✅",
                message=f"Your project has been submitted successfully. Best of luck for the results!",
                type="info"
            )

        # ACTIVATE Evaluation stage for participant
        next_p_stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 5,
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
                title="Evaluation in Progress 🧑‍⚖️",
                message=f"Your project is currently being reviewed by the evaluators.",
                type="info"
            )


        # COMPLETE build phase stage for committee
        current_c_stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 5, 
                Stage.is_committee_visible == True
            )
        )
        current_c_stage = current_c_stage_result.scalar_one_or_none()
        if current_c_stage:
            complete_stage(current_c_stage)

        # ACTIVATE Evaluation stage for committee
        next_c_stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 6,
                Stage.is_committee_visible == True
            )
        )
        next_c_stage = next_c_stage_result.scalar_one_or_none()

        if next_c_stage:
            activate_stage(next_c_stage)
            event.current_participant_stage = next_c_stage.name



    try:
        # 3. Commit state payload back to PostgreSQL database container
        
        await log_action(
            db=db,
            event_id=event_id,
            action_type="System",
            action=f"Submission phase {'opened' if is_open else 'closed'} by committee",
            actor="Admin Portal",
            meta=None
        )
        
        await db.commit()
        await db.refresh(event)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database sync failure updating lifecycle phase: {str(e)}"
        )

    return {
        "event_id": str(event.id),
        "is_submission_open": event.is_submission_open,
        "status": "Phase state synchronized successfully."
    }