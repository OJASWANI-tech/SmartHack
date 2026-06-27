import uuid
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload 
from datetime import datetime, timezone 

from app.db.session import get_db
from app.models.score_anomaly import ScoreAnomaly
from app.models.team import Team
from app.models.evaluator import Evaluator
from app.models.score import Score
from app.models.finalized_team import FinalizedTeam 
from app.schemas.orchestration_schemas import AnomalyRead, ResolveAnomalyRequest
from app.services import ai_service
from app.services.team_scores import apply_committee_correction
from app.services.activity_log import log_action

from app.core.dependencies import get_current_committee_member

logger = logging.getLogger("api.v1.anomalies")
router = APIRouter()


@router.get("/{event_id}/anomalies", response_model=List[AnomalyRead])
async def list_anomalies(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all detected score anomalies for an event.
    Optimized via Eager Joining onto the authoritative FinalizedTeam snapshot ledger.
    """
    result = await db.execute(
        select(ScoreAnomaly)
        .options(joinedload(ScoreAnomaly.finalized_team)) 
        .where(ScoreAnomaly.event_id == event_id)
        .order_by(ScoreAnomaly.created_at.desc())
    )
    anomalies = result.scalars().all()
    
    output = []
    for an in anomalies:
        team_name = "Unknown Team"
        
        # 1. First, check if the relationship object successfully lazy/eager loaded
        if an.finalized_team:
            team_name = an.finalized_team.name
        else:
            # 2. 🟢 FIXED FALLBACK: Safely match against the authoritative model attribute name 'finalized_team_id'
            ft_stmt = select(FinalizedTeam).where(
                (FinalizedTeam.id == an.finalized_team_id)
            )
            ft_res = await db.execute(ft_stmt)
            ft_record = ft_res.scalar_one_or_none()
            if ft_record:
                team_name = ft_record.name
        
        output.append({
            "id": an.id,
            "event_id": an.event_id,
            "team_id": an.finalized_team_id, # 🟢 Uses correct attribute name
            "team_name": team_name, 
            "severity": an.severity,
            "divergence_score": float(an.divergence_score),
            "ai_reasoning": an.ai_reasoning,
            "resolution_status": an.resolution_status,
            "resolution_action": an.resolution_action,
            "committee_note": an.committee_note,
            "resolved_at": an.resolved_at,
            "created_at": an.created_at
        })
        
    return output


@router.post("/{event_id}/anomalies/{anomaly_id}/resolve")
async def resolve_anomaly(
    event_id: uuid.UUID,
    anomaly_id: uuid.UUID,
    payload: ResolveAnomalyRequest,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    Resolves a score anomaly. Maps frontend state definitions safely to engine strategies,
    routing mutations directly into the authoritative FinalizedTeam snapshot ledger matrix.
    """
    an = (await db.execute(
        select(ScoreAnomaly).where(
            ScoreAnomaly.id == anomaly_id,
            ScoreAnomaly.event_id == event_id
        )
    )).scalar_one_or_none()
    
    if not an:
        raise HTTPException(status_code=404, detail="Anomaly record not found")

    raw_action = payload.resolution_action
    
    # ⚡ UNIFIED STRATEGY MATRIX: Normalizes UI string variants and state codes perfectly
    if raw_action in ["accepted", "accept_divergence", "Accept Explicit Divergence Baseline"]:
        target_action = "accepted"
        target_status = "resolved"
    elif raw_action in ["override_average", "Override with Panel Average"]:
        target_action = "override_average"
        target_status = "resolved"
    elif raw_action in ["request_rescore", "request_reevaluation"]:
        target_action = "request_rescore"
        target_status = "escalated"  # Correctly reflects escalation rather than false completion
    else:
        raise HTTPException(
            status_code=422, 
            detail=f"Unknown or non-supported resolution strategy value: '{raw_action}'."
        )
        
    an.resolution_status = target_status
    an.resolution_action = target_action
    an.committee_note = payload.committee_note or "Resolved via Admin Override Sequence."
    an.resolved_at = datetime.now(timezone.utc)
    
    # Execute transactional ledger correction mutation
    try:
        await apply_committee_correction(
            db=db,
            team_id=an.finalized_team_id,
            method=target_action,
            note=an.committee_note
        )
        # Force flush inside the pipeline to push modifications to disk before reading snapshots
        await db.flush()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
            
    # Synchronize operational indicators down to tracking tables cleanly
    ft = (await db.execute(select(FinalizedTeam).where(FinalizedTeam.id == an.finalized_team_id))).scalar_one_or_none()
    team = (await db.execute(select(Team).where(Team.id == ft.team_id))).scalar_one_or_none() if ft else None
    
    if team:
        if target_status == "resolved":
            team.final_score = ft.final_calculated_total if ft else team.final_score
            team.evaluation_status = "completed"
            if ft:
                ft.has_active_anomaly = False
        elif target_status == "escalated":
            team.evaluation_status = "in_progress"
            if ft:
                ft.has_active_anomaly = True
                

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Evaluation",
        action=f"Score anomaly resolved for team using strategy: {target_action}",
        actor="Admin Portal",
        meta={"anomaly_id": str(anomaly_id), "resolution_action": target_action}
    )
    await db.commit()
    return {
        "status": "success", 
        "message": f"Anomaly processed perfectly. Resolution strategy set to: '{target_action}'."
    }


@router.post("/{event_id}/anomalies/{anomaly_id}/request-rescore")
async def rescore_anomaly(
    event_id: uuid.UUID,
    anomaly_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    Direct Escalation Trigger Path matching the React 'handleForceRescore' call architecture.
    """
    an = (await db.execute(
        select(ScoreAnomaly).where(
            ScoreAnomaly.id == anomaly_id,
            ScoreAnomaly.event_id == event_id
        )
    )).scalar_one_or_none()
    
    if not an:
        raise HTTPException(status_code=404, detail="Anomaly not found")
        
    an.resolution_status = "escalated"
    an.resolution_action = "request_rescore"
    an.committee_note = "Escalated to judge notification queues for score alignment correction."
    an.resolved_at = datetime.now(timezone.utc)
    
    ft = (await db.execute(select(FinalizedTeam).where(FinalizedTeam.id == an.finalized_team_id))).scalar_one_or_none()
    if ft:
        ft.has_active_anomaly = True
    
    team = (await db.execute(select(Team).where(Team.id == ft.team_id))).scalar_one_or_none() if ft else None
    if team:
        team.evaluation_status = "in_progress"
        
    await db.commit()
    return {"status": "success", "message": "Rescoring requested from evaluators. Banners pushed successfully."}


@router.get("/{event_id}/anomalies/summary/{team_id}")
async def get_ai_divergence_summary(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Queries metrics and provides deep AI engine summary metrics for frontend insight panels.
    Optimized to parse the denormalized ledger matrix snapshot directly, bypassing N+1 table lookups.
    """
    # ⚡ Read straight from your updated finalized ledger snapshot row
    result = await db.execute(
        select(FinalizedTeam).where(
            (FinalizedTeam.id == team_id) | (FinalizedTeam.team_id == team_id)
        )
    )
    ft = result.scalar_one_or_none()
    
    if not ft:
        return {"divergence_summary": "Target team records missing from finalized tracking matrices."}
    
    # Extract the pre-saved array list of judging inputs
    scores = ft.scores_snapshot or []
    
    if len(scores) < 2:
        return {"divergence_summary": "Fewer than 2 score sheets processed in snapshot ledger. Insufficient metrics context."}
    
    scores_detail = []
    for s in scores:
        # Re-map the structural elements to match what your ai_service expectations demand
        scores_detail.append({
            "judge_name": s.get("judge_name", "Anonymous Judge"),
            "score_value": float(s.get("total", 0.0)),
            "criteria_breakdown": {
                "innovation": s.get("innovation", 0),
                "code_quality": s.get("code_quality", 0),
                "presentation": s.get("presentation", 0),
                "impact": s.get("impact", 0)
            },
            "notes": s.get("notes", "")
        })
        
    # Generate the dynamic summary using your pre-mapped records list
    divergence_summary = await ai_service.generate_divergence_explanation(ft.name, scores_detail)
    return {"divergence_summary": divergence_summary}