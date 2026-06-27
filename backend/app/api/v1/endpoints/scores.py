import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.models.score import Score
from app.models.team import Team
from app.models.evaluator import Evaluator
from app.models.approval_gate import ApprovalGate
from app.models.score_anomaly import ScoreAnomaly
from app.models.finalized_team import FinalizedTeam # ⚡ Added to populate frozen ledger
from app.schemas.common import ScoreSubmit, ScoreRead, MessageResponse
from app.engines.anomaly import detect_score_anomalies
from app.services.team_scores import recalculate_and_verify_team_scores # ⚡ Core snapshot engine
from app.services.activity_log import log_action

router = APIRouter()


@router.post("/{event_id}/scores", response_model=MessageResponse)
async def submit_score(
    event_id: uuid.UUID,
    payload: ScoreSubmit,
    access_token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Evaluator).where(Evaluator.access_token == access_token)
    )
    evaluator = result.scalar_one_or_none()
    if not evaluator:
        raise HTTPException(status_code=401, detail="Invalid access token")

    result = await db.execute(
        select(Team).where(
            Team.id == payload.team_id,
            Team.event_id == event_id,
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    existing = await db.execute(
        select(Score).where(
            Score.team_id == payload.team_id,
            Score.evaluator_id == evaluator.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already scored this team")

    if not 0 <= payload.score_value <= 10:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 10")

    score = Score(
        team_id=payload.team_id,
        evaluator_id=evaluator.id,
        score_value=payload.score_value,
        criteria_breakdown=payload.criteria_breakdown,
        notes=payload.notes,
        flagged=False,
    )
    db.add(score)
    await db.commit()
    return {"message": f"Score submitted for {team.name}"}


@router.get("/{event_id}/scores", response_model=List[ScoreRead])
async def list_scores(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Score)
        .join(Team, Team.id == Score.team_id)
        .where(Team.event_id == event_id)
    )
    return result.scalars().all()


@router.get("/{event_id}/scores/{team_id}", response_model=List[ScoreRead])
async def get_team_scores(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Score).where(Score.team_id == team_id)
    )
    return result.scalars().all()


@router.post("/{event_id}/scores/consolidate", response_model=MessageResponse)
async def consolidate_scores(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Consolidates team scores and generates high-speed snapshots 
    inside the finalized_teams production ledger.
    """
    teams_result = await db.execute(
        select(Team).where(
            Team.event_id == event_id,
            Team.approval_status == "approved",
        )
    )
    teams = teams_result.scalars().all()

    if not teams:
        raise HTTPException(status_code=400, detail="No approved teams found")

    anomalies_found = 0

    for team in teams:
        # ⚡ OPTIMIZATION: Eagerly load Evaluator metadata to prevent nested N+1 query traps
        scores_result = await db.execute(
            select(Score)
            .options(joinedload(Score.evaluator))
            .where(Score.team_id == team.id)
        )
        scores = scores_result.scalars().all()

        if not scores:
            continue

        scores_mapped = []
        for score in scores:
            evaluator = score.evaluator
            cb = score.criteria_breakdown or {}
            
            # Map score sheets into a structured matrix dictionary for the anomaly/snapshot engines
            scores_mapped.append({
                "id": score.id,
                "evaluator_id": score.evaluator_id,
                "judge_name": evaluator.name if evaluator else "Unknown Judge",
                "evaluator_name": evaluator.name if evaluator else "Unknown Judge",
                "score_value": float(score.score_value),
                "criteria_breakdown": cb,
                "innovation": int(cb.get("innovation", 0)),
                "code_quality": int(cb.get("code_quality", 0)),
                "presentation": int(cb.get("presentation", 0)),
                "impact": int(cb.get("impact", 0)),
                "notes": score.notes or "",
                "ai_consistency_flag": score.ai_consistency_flag,
                "ai_consistency_note": score.ai_consistency_note
            })

        # ⚡ LEDGER SYNC: Locate or create corresponding high-speed frozen snapshot item
        ft_result = await db.execute(
            select(FinalizedTeam).where(FinalizedTeam.team_id == team.id)
        )
        finalized_team = ft_result.scalar_one_or_none()

        if not finalized_team:
            finalized_team = FinalizedTeam(
                event_id=event_id,
                team_id=team.id,
                name=team.name,
                challenge=getattr(team, "challenge", "General Track"),
                members_snapshot=getattr(team, "members_snapshot", []),
                scores_snapshot=[]
            )
            db.add(finalized_team)

        # Run multi-dimensional in-memory snapshots
        await recalculate_and_verify_team_scores(finalized_team, scores_mapped)

        # Call real-time statistical anomaly engine
        detected = detect_score_anomalies(scores_mapped, threshold=2.0)
        
        if detected:
            anomalies_found += 1
            det = detected[0] # Handle principal statistical outlier
            
            # Update baseline tracking tables
            team.evaluation_status = "in_progress"
            
            # Update state machine details inside the high-speed ledger item
            finalized_team.has_active_anomaly = True
            finalized_team.anomaly_details = {
                "judge": det.get("evaluator_name", "Unknown Judge"),
                "dimension": det.get("anomaly_dimension", "presentation"),
                "delta": float(det.get("divergence_score", 0.0))
            }
            
            # Flag matching operational score entity fields
            for score in scores:
                if str(score.evaluator_id) == str(det.get("evaluator_id")):
                    score.flagged = True
            
            # Persist separate governance logging entity
            db_anomaly = ScoreAnomaly(
                event_id=event_id,
                finalized_team_id=finalized_team.id,
                severity=det.get("severity", "medium"),
                divergence_score=det.get("divergence_score", 0.0),
                ai_reasoning=det.get("ai_reasoning", "Statistical score deviation discovered via tracking loops."),
                resolution_status="pending"
            )
            db.add(db_anomaly)
            
        else:
            # If completely clean, finalize results immediately
            team.evaluation_status = "completed"
            team.final_score = finalized_team.final_calculated_total
            finalized_team.has_active_anomaly = False

    if anomalies_found > 0:
        db.add(ApprovalGate(
            event_id=event_id,
            gate_type="score_anomaly",
            status="pending",
            action_payload={"anomalies_found": anomalies_found},
        ))

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Evaluation",
        action=f"Scores consolidated for {len(teams)} teams, {anomalies_found} anomalies flagged",
        actor="System Engine",
        meta={"teams_count": len(teams), "anomalies_found": anomalies_found}
    )

    await db.commit()

    if anomalies_found > 0:
        return {
            "message": f"Scores consolidated. {anomalies_found} anomalies flagged.",
            "detail": "Approval gate created for committee review"
        }
    return {
        "message": "Scores consolidated successfully. No anomalies detected.",
        "detail": f"{len(teams)} teams scored and copied to frozen archives."
    }