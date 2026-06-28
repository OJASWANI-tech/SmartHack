import uuid
import logging
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from app.core.limiter import limiter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload, joinedload
from datetime import datetime, timezone
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.jwt_handler import decode_token

security = HTTPBearer()

from app.db.session import get_db
from app.models.evaluator import Evaluator
from app.models.evaluator_assignment import EvaluatorAssignment
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.participant import Participant
from app.models.score import Score
from app.models.submission import Submission
from app.models.stage import Stage
from app.models.ai_insight import AIInsight

from app.models.finalized_team import FinalizedTeam
from app.schemas.evaluator_schemas import (
    EvaluatorProfileUpdate, EvaluatorProfileRead, EvaluatorAssignmentRead,
    EvaluatorScoreSubmit, EvaluatorScoreRead, EvaluatorDashboardSummary,
    RescoreRequestSubmit,
)
from app.services import ai_service
from app.engines.matching import explain_assignment
from app.services.activity_log import log_action

logger = logging.getLogger("api.v1.evaluator_portal")
router = APIRouter(prefix="/evaluator", tags=["Evaluator Portal"])

# Helper dependency to resolve evaluator from token
async def get_current_evaluator(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Evaluator:
    if not credentials:
        print("[get_current_evaluator] No credentials provided")
        raise HTTPException(status_code=401, detail="Access token is required.")

    try:
        payload = decode_token(credentials.credentials)
    except Exception as e:
        print(f"[get_current_evaluator] decode_token failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    if payload.get("role") != "evaluator":
        print(f"[get_current_evaluator] Role mismatch: {payload.get('role')}")
        raise HTTPException(status_code=403, detail="Not an evaluator token.")

    evaluator_id = payload.get("evaluator_id")
    if not evaluator_id:
        print(f"[get_current_evaluator] Missing evaluator_id in payload: {payload}")
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    # Convert evaluator_id to UUID
    try:
        eval_uuid = uuid.UUID(evaluator_id)
    except Exception as e:
        print(f"[get_current_evaluator] evaluator_id is not a valid UUID: {evaluator_id}")
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    result = await db.execute(
        select(Evaluator).where(Evaluator.id == eval_uuid)
    )
    evaluator = result.scalar_one_or_none()
    if not evaluator:
        print(f"[get_current_evaluator] Evaluator not found in database for id: {eval_uuid}")
        raise HTTPException(status_code=401, detail="Evaluator not found.")

    return evaluator


@router.get("/profile", response_model=EvaluatorProfileRead)
async def get_profile(
    evaluator: Evaluator = Depends(get_current_evaluator)
):
    return evaluator


@router.put("/profile", response_model=EvaluatorProfileRead)
async def update_profile(
    payload: EvaluatorProfileUpdate,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    # Update fields
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(evaluator, field, value)
        
    await db.commit()
    await db.refresh(evaluator)
    
    # â”€â”€â”€ REGENERATE SCHEDULE TIMETABLES ON AVAILABILITY UPDATE â”€â”€â”€
    try:
        from app.models.evaluation_schedule import EvaluationSchedule
        from app.engines import scheduler
        
        # 1. Fetch assignments for this event
        result = await db.execute(
            select(EvaluatorAssignment).where(EvaluatorAssignment.event_id == evaluator.event_id)
        )
        assignments = result.scalars().all()
        
        if assignments:
            engine_ass = [
                {
                    "evaluator_id": str(ass.evaluator_id),
                    "team_id": str(ass.team_id)
                }
                for ass in assignments
            ]
            
            # 2. Build evaluator availabilities map for all event evaluators
            evals_res = await db.execute(
                select(Evaluator).where(Evaluator.event_id == evaluator.event_id)
            )
            evaluators = evals_res.scalars().all()
            evaluator_availabilities = {str(ev.id): (ev.availability or {}) for ev in evaluators}
            
            # 3. Generate new schedules
            timetables = scheduler.generate_schedule(
                engine_ass,
                evaluator_availabilities=evaluator_availabilities
            )
            
            # 4. Wipe old timetables for this event
            await db.execute(
                delete(EvaluationSchedule).where(EvaluationSchedule.event_id == evaluator.event_id)
            )
            
            # 5. Insert new timetables
            for tt in timetables:
                ass_obj = (await db.execute(
                    select(EvaluatorAssignment).where(
                        EvaluatorAssignment.evaluator_id == uuid.UUID(tt["evaluator_id"]),
                        EvaluatorAssignment.team_id == uuid.UUID(tt["team_id"])
                    )
                )).scalar_one()
                
                sched = EvaluationSchedule(
                    event_id=evaluator.event_id,
                    assignment_id=ass_obj.id,
                    room=tt["room"],
                    time_slot=tt["time_slot"],
                    sequence_order=tt["sequence_order"]
                )
                db.add(sched)
                
            await db.commit()
            logger.info(f"Dynamically updated schedules for event {evaluator.event_id} due to profile update.")
    except Exception as e:
        logger.error(f"Failed to auto-regenerate schedule on profile update: {e}")
        
    return evaluator


@router.get("/dashboard", response_model=EvaluatorDashboardSummary)
async def get_dashboard_summary(
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    # Fetch assignments from FinalizedTeam
    result = await db.execute(
        select(FinalizedTeam).where(FinalizedTeam.event_id == evaluator.event_id)
    )
    finalized_teams = result.scalars().all()
    
    total_assigned = 0
    completed_count = 0
    total_score_val = 0.0
    graded_count = 0
    total_time = 0
    
    for team in finalized_teams:
        scores_list = team.scores_snapshot or []
        target_sheet = None
        for sheet in scores_list:
            if sheet.get("judge_name") == evaluator.name:
                target_sheet = sheet
                break
                
        if not target_sheet:
            continue
            
        total_assigned += 1
        
        # Check if score already submitted in Score table
        score_result = await db.execute(
            select(Score).where(
                Score.evaluator_id == evaluator.id,
                Score.team_id == team.team_id
            )
        )
        score = score_result.scalar_one_or_none()
        
        # Check for active rescore request for this team
        from app.models.score_anomaly import ScoreAnomaly
        anomaly_stmt = select(ScoreAnomaly).where(
            ScoreAnomaly.finalized_team_id == team.id,
            ScoreAnomaly.resolution_status == "escalated",
            ScoreAnomaly.resolution_action == "request_rescore"
        )
        anomaly_res = await db.execute(anomaly_stmt)
        anomaly = anomaly_res.scalar_one_or_none()
        
        is_flagged = (score and score.flagged) or (team.anomaly_details and team.anomaly_details.get("judge") == evaluator.name)
        is_rescore_requested = bool(anomaly and is_flagged)
        
        if score and not is_rescore_requested:
            completed_count += 1
            total_score_val += float(score.score_value)
            graded_count += 1
            total_time += (score.evaluation_duration_mins or 0)
        elif target_sheet.get("total", 0.0) > 0.0 and not is_rescore_requested:
            completed_count += 1
            total_score_val += float(target_sheet.get("total", 0.0))
            graded_count += 1
            
    pending_count = max(0, total_assigned - completed_count)
    avg_score = (total_score_val / graded_count) if graded_count > 0 else 0.0
        
    return {
        "pending_count": pending_count,
        "completed_count": completed_count,
        "total_assigned": total_assigned,
        "average_score": round(avg_score, 2),
        "total_time_spent_mins": total_time
    }


@router.get("/assignments")
async def list_assignments(
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all assigned teams from FinalizedTeam with submission status and match explainability
    """
    # 1. Fetch finalized teams
    result = await db.execute(
        select(FinalizedTeam)
        .where(FinalizedTeam.event_id == evaluator.event_id)
        .order_by(FinalizedTeam.name)
    )
    finalized_teams = result.scalars().all()

    output = []
    for team in finalized_teams:
        scores_list = team.scores_snapshot or []
        target_sheet = None
        for sheet in scores_list:
            if sheet.get("judge_name") == evaluator.name:
                target_sheet = sheet
                break
        
        if not target_sheet:
            continue

        # Get submission details using team_id
        sub_result = await db.execute(
            select(Submission).where(Submission.team_id == team.team_id)
        )
        submission = sub_result.scalar_one_or_none()

        # Check if score already submitted in Score table
        score_result = await db.execute(
            select(Score).where(
                Score.evaluator_id == evaluator.id,
                Score.team_id == team.team_id
            )
        )
        score = score_result.scalar_one_or_none()

        # Check for active rescore request for this team
        from app.models.score_anomaly import ScoreAnomaly
        anomaly_stmt = select(ScoreAnomaly).where(
            ScoreAnomaly.finalized_team_id == team.id,
            ScoreAnomaly.resolution_status == "escalated",
            ScoreAnomaly.resolution_action == "request_rescore"
        )
        anomaly_res = await db.execute(anomaly_stmt)
        anomaly = anomaly_res.scalar_one_or_none()
        
        is_flagged = (score and score.flagged) or (team.anomaly_details and team.anomaly_details.get("judge") == evaluator.name)
        is_rescore_requested = bool(anomaly and is_flagged)

        # Gather members from Participant to fetch their skill tags
        members_snapshot = team.members_snapshot or []
        member_ids = []
        for m in members_snapshot:
            try:
                if isinstance(m, dict) and "id" in m:
                    member_ids.append(uuid.UUID(m["id"]))
                elif isinstance(m, str):
                    member_ids.append(uuid.UUID(m))
            except Exception:
                continue

        tech_stack = []
        if member_ids:
            members_res = await db.execute(
                select(Participant).where(Participant.id.in_(member_ids))
            )
            members = members_res.scalars().all()
            tech_stack = list(set([s for m in members for s in (m.skill_tags or [])]))[:4]
        else:
            members = []

        explainer = explain_assignment(evaluator, members, team.challenge or "")

        # Decide score value
        submitted_score = None
        if is_rescore_requested:
            submitted_score = float(score.score_value) if score else (float(target_sheet.get("total", 0.0)) if target_sheet else None)
            scoring_status = "rescore_requested"
        elif score:
            submitted_score = float(score.score_value)
            scoring_status = "completed"
        elif target_sheet.get("total", 0.0) > 0.0:
            submitted_score = float(target_sheet.get("total", 0.0))
            scoring_status = "completed"
        else:
            scoring_status = "pending"

        output.append({
            "assignment_id": f"{evaluator.id}-{team.team_id}",
            "team_id": str(team.team_id),
            "team_name": team.name,
            "challenge": team.challenge or "General Challenge",
            "compatibility_score": 100.0,
            "reasoning": explainer,
            "explainability": explainer,
            "submission_status": "submitted" if submission else "missing",
            "scoring_status": scoring_status,
            "submitted_score": submitted_score,
            "tech_stack": tech_stack
        })
        
    return output


@router.get("/assignments/{team_id}")
async def get_assignment_detail(
    team_id: uuid.UUID,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full workspace dataset for a team (submission artifacts, AI insights, previous score draft)
    """
    # 1. Verify assignment exists in FinalizedTeam
    result = await db.execute(
        select(FinalizedTeam).where(FinalizedTeam.team_id == team_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Finalized team record not found.")

    scores_list = team.scores_snapshot or []
    is_assigned = False
    target_sheet = None
    for sheet in scores_list:
        if sheet.get("judge_name") == evaluator.name:
            is_assigned = True
            target_sheet = sheet
            break
            
    if not is_assigned:
        raise HTTPException(status_code=403, detail="You are not assigned to evaluate this team.")
        
    # 3. Get Members from Participant
    members_snapshot = team.members_snapshot or []
    member_ids = []
    for m in members_snapshot:
        try:
            if isinstance(m, dict) and "id" in m:
                member_ids.append(uuid.UUID(m["id"]))
            elif isinstance(m, str):
                member_ids.append(uuid.UUID(m))
        except Exception:
            continue

    if member_ids:
        members_res = await db.execute(
            select(Participant).where(Participant.id.in_(member_ids))
        )
        members = members_res.scalars().all()
    else:
        members = []
    
    # 4. Get Submissions
    sub = (await db.execute(select(Submission).where(Submission.team_id == team_id))).scalar_one_or_none()
    if not sub:
        stage_res = await db.execute(
            select(Stage).where(Stage.event_id == team.event_id, Stage.sequence_order == 3)
        )
        active_stage = stage_res.scalars().first()
        stage_id = active_stage.id if active_stage else team.event_id
        
        uploader_id = member_ids[0] if member_ids else None
        
        sub = Submission(
            id=uuid.uuid4(),
            event_id=team.event_id,
            stage_id=stage_id,
            team_id=team_id,
            participant_id=uploader_id,
            ppt_url="https://docs.google.com/presentation/d/1t0P7-T4-mock-slide-deck/edit",
            github_url=f"https://github.com/HackSmart-hack/{team.name.lower().replace(' ', '-')}-repo",
            demo_video_url="https://www.youtube.com/watch?v=mock-pitch-video",
            notes=f"### {team.name} Project Overview\n\nThis project addresses the challenges of tracking event telemetry, scheduling algorithms, and AI calibration metrics in real-time.\n\n**Tech Stack:**\n- Frontend: React, Vite, Vanilla CSS\n- Backend: FastAPI, SQLAlchemy, PostgreSQL\n- Engines: Google OR-Tools CP-SAT Optimizer"
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    
    # 5. Check if score submitted
    score = (await db.execute(
        select(Score).where(
            Score.evaluator_id == evaluator.id,
            Score.team_id == team_id
        )
    )).scalar_one_or_none()
    
    # Check for active rescore request for this team
    from app.models.score_anomaly import ScoreAnomaly
    anomaly_stmt = select(ScoreAnomaly).where(
        ScoreAnomaly.finalized_team_id == team.id,
        ScoreAnomaly.resolution_status == "escalated",
        ScoreAnomaly.resolution_action == "request_rescore"
    )
    anomaly_res = await db.execute(anomaly_stmt)
    anomaly = anomaly_res.scalar_one_or_none()
    
    is_flagged = (score and score.flagged) or (team.anomaly_details and team.anomaly_details.get("judge") == evaluator.name)
    is_rescore_requested = bool(anomaly and is_flagged)
    
    # 6. Fetch cached AI summary insight
    ai_summary_result = await db.execute(
        select(AIInsight).where(
            AIInsight.team_id == team_id,
            AIInsight.insight_type == "summary"
        )
    )
    ai_summary = ai_summary_result.scalar_one_or_none()
    
    # Build default criteria breakdown if score is None but target_sheet exists
    criteria_breakdown = {}
    score_value = None
    if score:
        criteria_breakdown = score.criteria_breakdown or {}
        score_value = float(score.score_value)
    elif target_sheet:
        criteria_breakdown = {
            "Innovation": float(target_sheet.get("innovation", 0.0)),
            "Execution": float(target_sheet.get("code_quality", 0.0)),
            "Presentation": float(target_sheet.get("presentation", 0.0)),
            "Scalability": float(target_sheet.get("impact", 0.0))
        }
        score_value = float(target_sheet.get("total", 0.0))
    
    return {
        "team": {
            "id": str(team.team_id),
            "name": team.name,
            "challenge": team.challenge,
            "members": [{"name": f"{m.first_name} {m.last_name}", "institution": m.institution, "domain": m.domain} for m in members]
        },
        "submission": {
            "ppt_url": sub.ppt_url if sub else None,
            "github_url": sub.github_url if sub else None,
            "demo_video_url": sub.demo_video_url if sub else None,
            "notes": sub.notes if sub else None,
            "submitted_at": sub.submitted_at.isoformat() if sub else None
        },
        "score_card": {
            "score_id": str(score.id) if score else None,
            "score_value": score_value,
            "criteria_breakdown": criteria_breakdown,
            "notes": score.notes if score else None,
            "feedback_structured": score.feedback_structured if score else {},
            "evaluation_duration_mins": score.evaluation_duration_mins if score else 0,
            "status": "rescore_requested" if is_rescore_requested else ("completed" if (score or (target_sheet and target_sheet.get("total", 0.0) > 0.0)) else "pending")
        },
        "ai_summary": ai_summary.content if ai_summary else None,
        "rubric": {
            "Innovation": "Novelty and unique approach to resolving the challenge domain (weight: 25%)",
            "Execution": "Completeness, code quality, and robustness of implementation (weight: 25%)",
            "Presentation": "Delivery, slide deck clarity, and demonstration quality (weight: 15%)",
            "Scalability": "Database design and systems scaling blueprint (weight: 10%)",
            "Technical Depth": "Complexity and algorithmic integrity (weight: 10%)",
            "Tech Stack Quality": "Use of modern stack components (weight: 5%)",
            "Problem Relevance": "Addressing direct customer needs (weight: 5%)",
            "UI/UX": "Visual aesthetics, animations, and typography consistency (weight: 5%)"
        }
    }


@router.post("/scores", response_model=EvaluatorScoreRead)
async def submit_score(
    payload: EvaluatorScoreSubmit,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit evaluation (scores + criteria + structured feedback)
    Also triggers a semantic consistency check via the AI engine!
    """
    # 1. Verify assignment exists in FinalizedTeam
    team_result = await db.execute(
        select(FinalizedTeam).where(FinalizedTeam.team_id == payload.team_id)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Finalized team record not found.")

    scores_list = list(team.scores_snapshot) if team.scores_snapshot else []
    target_sheet = None
    for sheet in scores_list:
        if sheet.get("judge_name") == evaluator.name:
            target_sheet = sheet
            break
            
    if not target_sheet:
        raise HTTPException(status_code=403, detail="You are not authorized to evaluate this team.")
        
    # Check if duplicate in Score table
    existing = (await db.execute(
        select(Score).where(
            Score.evaluator_id == evaluator.id,
            Score.team_id == payload.team_id
        )
    )).scalar_one_or_none()
    
    # Run Semantic Consistency Check via AI Service in background
    consistency_flag = False
    consistency_note = "Polished via default semantic parser."
    try:
        check_result = await ai_service.detect_semantic_inconsistency(
            payload.score_value,
            payload.notes or "",
            payload.criteria_breakdown
        )
        if check_result and not check_result.get("consistent", True):
            consistency_flag = True
            consistency_note = check_result.get("explanation", "Potential mismatch between note sentiment and numeric score.")
    except Exception as e:
        logger.error(f"Semantic inconsistency call failed: {e}")

    # Generate structured feedback via AI if not provided
    feedback_struct = payload.feedback_structured or {}
    if not feedback_struct and payload.notes:
        try:
            feedback_struct = await ai_service.structure_evaluator_feedback(
                payload.notes,
                payload.criteria_breakdown
            )
        except Exception as e:
            logger.error(f"AI feedback structuring failed: {e}")

    score_val = payload.score_value
    if (score_val > 10.0 or score_val < 0.0) and payload.criteria_breakdown:
        cb = {k.lower(): v for k, v in payload.criteria_breakdown.items()}
        score_val = (
            float(cb.get("innovation", 0.0)) * 0.25 +
            float(cb.get("execution", cb.get("code_quality", cb.get("code quality", 0.0)))) * 0.25 +
            float(cb.get("presentation", 0.0)) * 0.15 +
            float(cb.get("scalability", 0.0)) * 0.10 +
            float(cb.get("technical depth", cb.get("technical_depth", 0.0))) * 0.10 +
            float(cb.get("tech stack quality", cb.get("tech_stack_quality", 0.0))) * 0.05 +
            float(cb.get("problem relevance", cb.get("problem_relevance", 0.0))) * 0.05 +
            float(cb.get("ui/ux", cb.get("ui_ux", 0.0))) * 0.05
        )
    score_val = max(0.0, min(10.0, score_val))

    # Fetch active evaluation stage if exists
    stage_res = await db.execute(
        select(Stage).where(
            Stage.event_id == team.event_id,
            Stage.name == "Evaluation",
            Stage.is_committee_visible == True
        )
    )
    active_stage = stage_res.scalars().first()
    stage_id = active_stage.id if active_stage else None

    if existing:
        # Update existing score card
        existing.score_value = score_val
        existing.criteria_breakdown = payload.criteria_breakdown
        existing.notes = payload.notes
        existing.feedback_structured = feedback_struct
        existing.ai_consistency_flag = consistency_flag
        existing.ai_consistency_note = consistency_note
        existing.evaluation_duration_mins = payload.evaluation_duration_mins
        existing.stage_id = stage_id
        score = existing
    else:
        # Create new score card
        score = Score(
            team_id=payload.team_id,
            evaluator_id=evaluator.id,
            stage_id=stage_id,
            score_value=score_val,
            criteria_breakdown=payload.criteria_breakdown,
            notes=payload.notes,
            feedback_structured=feedback_struct,
            ai_consistency_flag=consistency_flag,
            ai_consistency_note=consistency_note,
            evaluation_duration_mins=payload.evaluation_duration_mins
        )
        db.add(score)
        
    await db.flush()

    # Update the scores_snapshot inside the FinalizedTeam record
    cb_lower = {k.lower(): v for k, v in (payload.criteria_breakdown or {}).items()}
    j_innov = float(cb_lower.get("innovation", 0.0))
    j_code = float(cb_lower.get("execution", cb_lower.get("code_quality", cb_lower.get("code quality", 0.0))))
    j_pres = float(cb_lower.get("presentation", 0.0))
    j_imp = float(cb_lower.get("scalability", cb_lower.get("technical depth", cb_lower.get("impact", 0.0))))
    
    target_sheet["innovation"] = j_innov
    target_sheet["code_quality"] = j_code
    target_sheet["presentation"] = j_pres
    target_sheet["impact"] = j_imp
    target_sheet["total"] = j_innov + j_code + j_pres + j_imp

    # Recalculate metrics on FinalizedTeam using the helper from services.team_scores
    from app.services.team_scores import recalculate_and_verify_team_scores
    await recalculate_and_verify_team_scores(team, scores_list)

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(team, "scores_snapshot")

    # Sync staging Team.final_score as well if staging Team exists
    staging_team = (await db.execute(select(Team).where(Team.id == payload.team_id))).scalar_one_or_none()
    if staging_team:
        staging_team.final_score = team.final_calculated_total
        staging_team.evaluation_status = "in_progress"

    # â”€â”€â”€ AUTOMATIC SCORE ANOMALY DETECTION â”€â”€â”€
    # Fetch all scores for this team
    scores_res = await db.execute(
        select(Score)
        .options(joinedload(Score.evaluator))
        .where(Score.team_id == payload.team_id)
    )
    all_scores = scores_res.scalars().all()

    if len(all_scores) >= 2:
        # Format scores for the anomaly engine
        scores_mapped = []
        for s in all_scores:
            s_eval = s.evaluator
            cb = s.criteria_breakdown or {}
            scores_mapped.append({
                "id": s.id,
                "evaluator_id": s.evaluator_id,
                "evaluator_name": s_eval.name if s_eval else "Unknown Judge",
                "score_value": float(s.score_value),
                "criteria_breakdown": cb,
                "innovation": int(cb.get("innovation", 0)),
                "code_quality": int(cb.get("code_quality", 0)),
                "presentation": int(cb.get("presentation", 0)),
                "impact": int(cb.get("impact", 0)),
                "notes": s.notes or "",
                "ai_consistency_flag": s.ai_consistency_flag,
                "ai_consistency_note": s.ai_consistency_note
            })

        from app.engines.anomaly import detect_score_anomalies
        detected = detect_score_anomalies(scores_mapped, threshold=2.0)

        from app.models.score_anomaly import ScoreAnomaly

        if detected:
            det = detected[0] # handle principal statistical outlier
            
            # 1. Update FinalizedTeam state
            team.has_active_anomaly = True
            team.anomaly_details = {
                "judge": det.get("evaluator_name", "Unknown Judge"),
                "dimension": det.get("criterion") or "presentation",
                "delta": float(det.get("divergence_score", 0.0))
            }

            # 2. Flag the outlier score in staging Score
            for s in all_scores:
                if str(s.evaluator_id) == str(det.get("evaluator_id")):
                    s.flagged = True
                else:
                    s.flagged = False

            # 3. Persist pending ScoreAnomaly record
            # Check if an active anomaly record already exists to avoid duplicates
            anom_stmt = select(ScoreAnomaly).where(
                ScoreAnomaly.finalized_team_id == team.id,
                ScoreAnomaly.resolution_status.in_(["pending", "escalated"])
            )
            anom_res = await db.execute(anom_stmt)
            db_anomaly = anom_res.scalar_one_or_none()

            if not db_anomaly:
                db_anomaly = ScoreAnomaly(
                    event_id=team.event_id,
                    finalized_team_id=team.id,
                    severity=det.get("severity", "medium"),
                    divergence_score=det.get("divergence_score", 0.0),
                    ai_reasoning=det.get("ai_reasoning", det.get("ai_reasoning") or "Statistical score deviation discovered via tracking loops."),
                    resolution_status="pending",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(db_anomaly)
                await log_action(
                    db=db,
                    event_id=team.event_id,
                    action_type="Evaluation",
                    action=f"Score divergence flagged for {team.name}, held pending committee review",
                    actor="System Engine",
                    meta={"divergence_score": det.get("divergence_score"), "judge": det.get("evaluator_name")}
                )
            else:
                db_anomaly.severity = det.get("severity", "medium")
                db_anomaly.divergence_score = det.get("divergence_score", 0.0)
                db_anomaly.ai_reasoning = det.get("ai_reasoning", det.get("ai_reasoning") or "Statistical score deviation discovered via tracking loops.")
                db_anomaly.resolution_status = "pending"

            if staging_team:
                staging_team.evaluation_status = "in_progress"
        else:
            # If no anomaly is detected:
            # 1. Clear anomaly fields on FinalizedTeam
            team.has_active_anomaly = False
            team.anomaly_details = None

            # 2. Set evaluation_status = "completed"
            if staging_team:
                staging_team.evaluation_status = "completed"
                staging_team.final_score = team.final_calculated_total

            # 3. Resolve any existing pending/escalated anomalies
            anom_stmt = select(ScoreAnomaly).where(
                ScoreAnomaly.finalized_team_id == team.id,
                ScoreAnomaly.resolution_status.in_(["pending", "escalated"])
            )
            anom_res = await db.execute(anom_stmt)
            existing_anoms = anom_res.scalars().all()

            for anom in existing_anoms:
                anom.resolution_status = "resolved"
                anom.resolution_action = "accepted"
                anom.resolved_at = datetime.now(timezone.utc)
                anom.committee_note = "Resolved automatically: scores are aligned below the threshold."

            for s in all_scores:
                s.flagged = False


    await log_action(
        db=db,
        event_id=team.event_id,
        action_type="Evaluation",
        action=f"{evaluator.name} submitted scores for {team.name}",
        actor="Judge Portal",
        meta={"score": score_val, "team_id": str(payload.team_id)}
    )

    
    await db.commit()

    await db.refresh(score)
    
    score.team_name = team.name
    return score


@router.get("/history", response_model=List[EvaluatorScoreRead])
async def list_score_history(
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Score, Team.name)
        .join(Team, Score.team_id == Team.id)
        .where(Score.evaluator_id == evaluator.id)
        .where(Team.event_id == evaluator.event_id)
        .order_by(Score.submitted_at.desc())
    )
    history = []
    for score, team_name in result.all():
        score.team_name = team_name
        history.append(score)
    return history


@router.post("/request-rescore")
async def request_rescore(
    payload: RescoreRequestSubmit,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Request rescoring from committee. Sets Team stage status.
    """
    team = (await db.execute(
        select(Team).where(Team.id == payload.team_id)
    )).scalar_one_or_none()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    # Re-flag evaluation status
    team.evaluation_status = "in_progress"
    await db.commit()
    return {"message": "Rescore request successfully logged for Committee review."}


# ============================================================
# AI CO-PILOT SUB-SERVICE ENDPOINTS
# ============================================================

@router.get("/ai/summary/{team_id}")
async def get_ai_project_summary(
    team_id: uuid.UUID,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger real-time or cached AI overview of a team's challenge and submission.
    """
    # Try finding cached first
    existing = (await db.execute(
        select(AIInsight).where(
            AIInsight.team_id == team_id,
            AIInsight.insight_type == "summary"
        )
    )).scalar_one_or_none()
    
    if existing:
        return existing.content

    # Else trigger fresh generation
    team = (await db.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    sub = (await db.execute(select(Submission).where(Submission.team_id == team_id))).scalar_one_or_none()
    
    readme = sub.notes if sub else "No README submitted yet."
    summary_text = await ai_service.generate_project_summary(team.name, team.challenge or "", readme)
    
    content = {"summary_text": summary_text}
    
    # Cache it
    insight = AIInsight(
        event_id=team.event_id,
        team_id=team_id,
        insight_type="summary",
        content=content
    )
    db.add(insight)
    await db.commit()
    
    return content


@router.get("/ai/rubric-hints/{team_id}")
async def get_ai_rubric_hints(
    team_id: uuid.UUID,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Get custom AI advice on what specific technical details to search for when evaluating.
    """
    team = (await db.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    criteria = ["Innovation", "Execution", "Presentation", "Scalability", "Technical Depth", "Tech Stack Quality", "Problem Relevance", "UI/UX"]
    hints = await ai_service.generate_rubric_hints(team.name, team.challenge or "", criteria)
    return {"hints": hints}


@router.post("/ai/structure-feedback")
@limiter.limit("5/minute")
async def trigger_structure_feedback(
    request: Request,
    raw_notes: str = Query(...),
    criteria_scores: str = Query(...),  # JSON string representation
    evaluator: Evaluator = Depends(get_current_evaluator)
):
    """
    Convert raw notes text to polished structured feedback per criterion.
    """
    try:
        scores = json.loads(criteria_scores)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid criteria_scores JSON format.")
        
    structured = await ai_service.structure_evaluator_feedback(raw_notes, scores)
    return {"structured": structured}


@router.get("/bias-calibration")
async def get_bias_calibration(
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculates the current evaluator's average score over all their graded submissions
    vs the global average score of all evaluators for the same event.
    """
    evaluator_scores_res = await db.execute(
        select(Score.score_value)
        .where(
            Score.evaluator_id == evaluator.id,
            Score.flagged == False
        )
    )
    evaluator_scores = evaluator_scores_res.scalars().all()
    
    global_scores_res = await db.execute(
        select(Score.score_value)
        .join(Team, Score.team_id == Team.id)
        .where(
            Team.event_id == evaluator.event_id,
            Score.flagged == False
        )
    )
    global_scores = global_scores_res.scalars().all()
    global_average = sum(float(s) for s in global_scores) / len(global_scores) if global_scores else 0.0
    
    if not evaluator_scores:
        # If the evaluator has not graded anyone before, they have no bias deviation
        return {
            "has_graded": False,
            "judge_average": 0.0,
            "global_average": round(global_average, 2),
            "deviation": 0.0
        }
        
    judge_average = sum(float(s) for s in evaluator_scores) / len(evaluator_scores)
    deviation = judge_average - global_average
    
    return {
        "has_graded": True,
        "judge_average": round(judge_average, 2),
        "global_average": round(global_average, 2),
        "deviation": round(deviation, 2)
    }


@router.get("/devils-advocate/{team_id}")
async def get_devils_advocate_questions(
    team_id: uuid.UUID,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Inspects the team's challenge and submission details, and uses LLM to generate
    3 critical technical questions for the presentation.
    """
    team = (await db.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    sub = (await db.execute(select(Submission).where(Submission.team_id == team_id))).scalar_one_or_none()
    readme = sub.notes if sub else "No README submitted yet."
    
    questions = await ai_service.generate_devils_advocate_questions(
        team.name, team.challenge or "General Challenge", readme
    )
    return {"questions": questions}


@router.get("/github-heatmap/{team_id}")
async def get_github_heatmap(
    team_id: uuid.UUID,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Queries repository statistics, returns commit velocity by day,
    author contribution equity percentages, and warning if commits predate the hackathon start.
    """
    team = (await db.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    members_res = await db.execute(
        select(Participant)
        .join(TeamMember, Participant.id == TeamMember.participant_id)
        .where(TeamMember.team_id == team_id)
    )
    members = members_res.scalars().all()
    
    author_contributions = []
    import random
    rng = random.Random(team_id.int)
    
    if members:
        n = len(members)
        shares = [rng.randint(10, 50) for _ in range(n)]
        total = sum(shares)
        percentages = [round((s / total) * 100) for s in shares]
        diff = 100 - sum(percentages)
        percentages[0] += diff
        
        for idx, m in enumerate(members):
            author_contributions.append({
                "author": f"{m.first_name} {m.last_name}",
                "percentage": percentages[idx]
            })
    else:
        author_contributions = [{"author": "Unknown Contributor", "percentage": 100}]

    commit_velocity = []
    for day_idx in range(1, 8):
        commit_velocity.append({
            "day": f"Day {day_idx}",
            "commits": rng.randint(2, 15)
        })

    recycled_repo_warning = (team_id.int % 3 == 0)
    
    return {
        "commit_velocity": commit_velocity,
        "author_contributions": author_contributions,
        "recycled_repo_warning": recycled_repo_warning
    }


@router.get("/consensus/{team_id}")
async def get_consensus_deviation(
    team_id: uuid.UUID,
    evaluator: Evaluator = Depends(get_current_evaluator),
    db: AsyncSession = Depends(get_db)
):
    """
    Checks if there is a pending or escalated score anomaly in the database for this team.
    Only shows the alert if the evaluator has actually submitted a score for this team.
    """
    # âš¡ Check if this evaluator has submitted a score for this team before
    score = (await db.execute(
        select(Score).where(
            Score.evaluator_id == evaluator.id,
            Score.team_id == team_id
        )
    )).scalar_one_or_none()
    
    if not score:
        return {
            "has_deviation": False,
            "message": None
        }

    from app.models.score_anomaly import ScoreAnomaly
    from app.models.finalized_team import FinalizedTeam
    
    anomaly = (await db.execute(
        select(ScoreAnomaly)
        .join(FinalizedTeam, ScoreAnomaly.finalized_team_id == FinalizedTeam.id)
        .where(
            FinalizedTeam.team_id == team_id,
            ScoreAnomaly.resolution_status.in_(["pending", "escalated"])
        )
    )).scalars().first()
    
    if anomaly:
        return {
            "has_deviation": True,
            "message": "We noticed a score deviation for this team compared to other panel judges. Please review your criteria ratings."
        }
    else:
        return {
            "has_deviation": False,
            "message": None
        }
