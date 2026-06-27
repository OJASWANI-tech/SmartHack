import csv
import io
import uuid
from collections import defaultdict
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Dynamic core dependency & engine hooks
from app.db.session import get_db
from app.core.dependencies import require_role
from app.services.team_scores import apply_committee_correction
from app.models.finalized_team import FinalizedTeam
from app.models.event import Event
from app.utils.stages_utils import activate_stage, complete_stage
from app.models.stage import Stage
from app.services.activity_log import log_action

router = APIRouter(prefix="/committee", tags=["committee"])

# Mock approval state
PENDING_APPROVALS = [
    {"id": 1, "type": "team_formation", "team_name": "Team Orion",  "status": "pending"},
    {"id": 2, "type": "team_formation", "team_name": "Team Nexus",  "status": "pending"},
    {"id": 3, "type": "send_emails",    "team_name": None,          "status": "pending"},
]

class ApprovalAction(BaseModel):
    action: str   # "approve" or "reject"
    note: str = ""

class AnomalyResolutionRequest(BaseModel):
    method: str      # "Override with Panel Average" or "Request Re-evaluation from Judge"
    note: Optional[str] = ""


@router.get("/approvals")
def get_pending_approvals(payload: dict = Depends(require_role("committee"))):
    pending = [a for a in PENDING_APPROVALS if a["status"] == "pending"]
    return {"approvals": pending, "count": len(pending)}


@router.post("/approvals/{approval_id}")
async def act_on_approval(
    approval_id: int,
    body: ApprovalAction,
    payload: dict = Depends(require_role("committee")),
):
    approval = next((a for a in PENDING_APPROVALS if a["id"] == approval_id), None)
    if not approval:
        return {"error": "Approval not found"}

    approval["status"] = body.action + "d"   # "approved" or "rejected"

    if approval.get("team_name"):
        try:
            # 🌟 Localized import breaks circular loops between router endpoints
            from app.api.v1.endpoints.evaluators import notify_evaluators
            await notify_evaluators(approval["team_name"], approval["status"])
        except (ImportError, AttributeError):
            print(f"⚠️ Live update failed. Broadcast utility missing. State changed to {approval['status']}")

    return {
        "approval_id": approval_id,
        "action": body.action,
        "team": approval.get("team_name"),
        "note": body.note,
    }


@router.post("/teams/{team_id}/resolve-anomaly")
async def resolve_team_anomaly(
    team_id: str,
    payload: AnomalyResolutionRequest,
    db: AsyncSession = Depends(get_db),
    auth_user: dict = Depends(require_role("committee")),
):
    try:
        updated_team = await apply_committee_correction(
            db=db, 
            team_id=team_id, 
            method=payload.method, 
            note=payload.note
        )
        
        try:
            # 🌟 Localized import breaks circular loops between router endpoints
            from app.api.v1.endpoints.evaluators import notify_evaluators
            await notify_evaluators(updated_team.name, "resolved_anomaly")
        except (ImportError, AttributeError):
            print(f"⚠️ Live WebSocket update skipped for {updated_team.name} due to cyclic path state.")
        
        return {
            "status": "success",
            "team_id": str(updated_team.team_id),
            "resolved_by": payload.method,
            "message": f"Successfully processed resolution patch for {updated_team.name}."
        }
        
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except Exception as general_err:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal database worker crash: {str(general_err)}")


# ─── ⚖️ NEW: JUDGES LOGISTIC EXPERTISE ENGINE ───
@router.post("/events/{event_id}/upload-judges-expertise", status_code=status.HTTP_200_OK)
async def upload_judges_expertise(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    auth_user: dict = Depends(require_role("committee")),
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400, 
            detail="Target format constraint violation. Document file must be a valid CSV."
        )

    try:
        contents = await file.read()
        buffer = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(buffer)
        
        # Structure: {"AI Automation Track": ["Judge Alpha", "Judge Beta"]}
        expertise_map = defaultdict(list)
        
        for row in reader:
            judge_name = row.get("judge_name", "").strip()
            expertise_string = row.get("expertise", "").strip()
            
            if not judge_name or not expertise_string:
                continue
                
            expert_categories = [cat.strip() for cat in expertise_string.split(',') if cat.strip()]
            for category in expert_categories:
                expertise_map[category].append(judge_name)
                
    except Exception as parse_err:
        raise HTTPException(
            status_code=422, 
            detail=f"Failed to cleanly interpret incoming streaming matrix: {str(parse_err)}"
        )

    # Fetch your active finalized team list context structure
    stmt = select(FinalizedTeam).where(FinalizedTeam.event_id == event_id)
    res = await db.execute(stmt)
    db_teams = res.scalars().all()
    
    if not db_teams:
        raise HTTPException(
            status_code=404, 
            detail="No active finalized team assets currently loaded inside event ledger indexes."
        )

    for team in db_teams:
        team_challenge = team.challenge.strip() if team.challenge else "General Track"
        matching_judges = expertise_map.get(team_challenge, [])
        
        # Explicit fallback if standard tracking isn't found
        if not matching_judges and team_challenge != "General Track":
            matching_judges = expertise_map.get("General Track", [])

        allocated_panel_snapshot = []
        for judge in matching_judges:
            placeholder_sheet = {
                "judge_name": judge,
                "innovation": 0.0,
                "code_quality": 0.0,
                "presentation": 0.0,
                "impact": 0.0,
                "total": 0.0
            }
            allocated_panel_snapshot.append(placeholder_sheet)
            
        # Commit the populated JSON array directly to that row's instance reference
        team.scores_snapshot = allocated_panel_snapshot
        
        # Re-initialize basic math aggregates to clear default tracking baselines
        team.final_calculated_total = 0.0
        team.panel_average_innovation = 0.0
        team.panel_average_code = 0.0
        team.panel_average_presentation = 0.0
        team.panel_average_impact = 0.0
        team.has_active_anomaly = False
        team.anomaly_details = None

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Evaluation",
        action="Judges allocated to teams based on domain expertise",
        actor="Admin Portal",
        meta={"teams_assigned": len(db_teams)}
    )

    await db.commit()
    return {
        "status": "success", 
        "detail": "Judges allocated to target assignments based on domain-expertise configurations."
    }

@router.post("/events/{event_id}/toggle-submission")
async def toggle_submission_phase(
    event_id: uuid.UUID, 
    is_open: bool, 
    db: AsyncSession = Depends(get_db)
):
    print(f"TOGGLE CALLED: event_id={event_id}, is_open={is_open}")  # ← add this
    """
    Explicitly open or close the submission phase for a specific hackathon event.
    """
    # Fetch the event
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event configuration blueprint not found")
    
    # Switch the phase state flag
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
        print(f"BUILD STAGE FOUND: {build_stage}")
        print(f"BUILD STAGE ID: {build_stage.id if build_stage else 'NOT FOUND'}")

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
        print(f"SUBMISSION STAGE FOUND: {current_p_stage}")
        print(f"SUBMISSION STAGE ID: {current_p_stage.id if current_p_stage else 'NOT FOUND'}")

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

    await log_action(
        db=db,
        event_id=event_id,
        action_type="System",
        action=f"Submission phase {'opened' if is_open else 'closed'} by committee",
        actor="Admin Portal",
        meta=None
    )

    await db.commit()
    
    phase_text = "opened" if is_open else "closed"
    return {"status": "success", "message": f"Submission phase successfully {phase_text}."}