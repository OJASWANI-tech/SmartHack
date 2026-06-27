import uuid
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.evaluator import Evaluator
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.participant import Participant
from app.models.evaluator_assignment import EvaluatorAssignment
from app.models.evaluation_schedule import EvaluationSchedule
from app.models.event import Event
# Imported for the summary telemetry dashboard logic
from app.models.score import Score 
from app.services.activity_log import log_action
from app.core.dependencies import get_current_committee_member

from app.schemas.orchestration_schemas import (
    OptimizerConstraints, RunOptimizationRequest, ScheduleSlot, ScheduleGridRead,
    AssignmentOverride, AssignmentExplanation, OptimizationAnalytics,
)
from app.engines import matching, optimizer, scheduler

logger = logging.getLogger("api.v1.orchestration")
router = APIRouter()


@router.post("/{event_id}/orchestration/run-matching")
async def run_matching_engine(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    1. Precomputes matching scores for all evaluators and teams.
    2. Returns compatibility score matrix.
    """
    # Verify Event
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Get evaluators
    eval_result = await db.execute(select(Evaluator).where(Evaluator.event_id == event_id))
    evaluators = eval_result.scalars().all()
    
    # Get teams + members
    team_result = await db.execute(select(Team).where(Team.event_id == event_id))
    teams = team_result.scalars().all()
    
    if not evaluators or not teams:
        raise HTTPException(status_code=400, detail="Cannot run matching. Seed evaluators and teams first.")
        
    teams_with_members = []
    for team in teams:
        members_result = await db.execute(
            select(Participant)
            .join(TeamMember, Participant.id == TeamMember.participant_id)
            .where(TeamMember.team_id == team.id)
        )
        members = members_result.scalars().all()
        teams_with_members.append((team, members))
        
    # Calculate matrix
    matrix = matching.generate_compatibility_matrix(evaluators, teams_with_members)
    return {
        "status": "success",
        "matrix": matrix,
        "summary": {
            "evaluators_count": len(evaluators),
            "teams_count": len(teams)
        }
    }


@router.post("/{event_id}/orchestration/run-optimizer")
async def run_optimizer(
    event_id: uuid.UUID,
    payload: RunOptimizationRequest,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    Executes Google OR-Tools CP-SAT judge assignments and persists assignments.
    """
    constraints = payload.constraints or OptimizerConstraints()
    
    # 1. Load data
    evaluators = (await db.execute(select(Evaluator).where(Evaluator.event_id == event_id))).scalars().all()
    teams = (await db.execute(select(Team).where(Team.event_id == event_id))).scalars().all()
    
    if not evaluators or not teams:
        raise HTTPException(status_code=400, detail="Ensure you have loaded both evaluators and teams.")
        
    teams_with_members = []
    for team in teams:
        members = (await db.execute(
            select(Participant)
            .join(TeamMember, Participant.id == TeamMember.participant_id)
            .where(TeamMember.team_id == team.id)
        )).scalars().all()
        teams_with_members.append((team, members))
        
    # 2. Get matrix
    matrix = matching.generate_compatibility_matrix(evaluators, teams_with_members)
    
    # 3. Solve!
    try:
        assignments = optimizer.solve_assignment(
            matrix,
            evaluators_per_team=constraints.evaluators_per_team,
            max_workload=constraints.max_workload
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver engine encountered a structural failure: {e}")
        
    if not assignments:
        raise HTTPException(status_code=422, detail="No feasible matching assignment could be resolved under specified constraints.")
        
    # 4. Save results to database (Wipe previous assignments for this event first)
    await db.execute(
        delete(EvaluatorAssignment).where(EvaluatorAssignment.event_id == event_id)
    )
    
    db_assignments = []
    for ass in assignments:
        new_ass = EvaluatorAssignment(
            event_id=event_id,
            evaluator_id=uuid.UUID(ass["evaluator_id"]),
            team_id=uuid.UUID(ass["team_id"]),
            compatibility_score=ass["compatibility_score"],
            reasoning=ass["reasoning"]
        )
        db.add(new_ass)
        db_assignments.append(new_ass)

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Matching",
        action=f"Judge assignments optimized: {len(db_assignments)} assignments generated",
        actor="AI Optimization",
        meta={"assignments_count": len(db_assignments)}
    )
        
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Successfully optimized and persisted {len(db_assignments)} judge assignments.",
        "assignments_count": len(db_assignments)
    }


@router.post("/{event_id}/orchestration/run-scheduler")
async def run_scheduler(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    Converts evaluator assignments into conflict-free rooms and time slot timetables
    """
    # 1. Fetch assignments
    result = await db.execute(
        select(EvaluatorAssignment).where(EvaluatorAssignment.event_id == event_id)
    )
    assignments = result.scalars().all()
    
    if not assignments:
        raise HTTPException(status_code=400, detail="Trigger judge optimization assignment prior to scheduling.")
        
    # Map model assignments to engine format
    engine_ass = []
    for ass in assignments:
        engine_ass.append({
            "evaluator_id": str(ass.evaluator_id),
            "team_id": str(ass.team_id)
        })
        
    # Fetch all evaluators to build availability map
    evals_res = await db.execute(
        select(Evaluator).where(Evaluator.event_id == event_id)
    )
    evaluators = evals_res.scalars().all()
    evaluator_availabilities = {str(ev.id): (ev.availability or {}) for ev in evaluators}

    # 2. Generate timetables
    timetables = scheduler.generate_schedule(
        engine_ass,
        evaluator_availabilities=evaluator_availabilities
    )
    
    # 3. Save to database (Wipe previous event timetables first)
    await db.execute(
        delete(EvaluationSchedule).where(EvaluationSchedule.event_id == event_id)
    )
    
    for tt in timetables:
        # Resolve the specific EvaluatorAssignment id
        ass_obj = (await db.execute(
            select(EvaluatorAssignment).where(
                EvaluatorAssignment.evaluator_id == uuid.UUID(tt["evaluator_id"]),
                EvaluatorAssignment.team_id == uuid.UUID(tt["team_id"])
            )
        )).scalar_one()
        
        schedule = EvaluationSchedule(
            event_id=event_id,
            assignment_id=ass_obj.id,
            room=tt["room"],
            time_slot=tt["time_slot"],
            sequence_order=tt["sequence_order"]
        )
        db.add(schedule)

    await log_action(
        db=db,
        event_id=event_id,
        action_type="System",
        action=f"Evaluation timetables generated: {len(timetables)} schedule slots created",
        actor="System Engine",
        meta={"schedules_count": len(timetables)}
    )
        
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Successfully created timetables for {len(timetables)} evaluation sessions.",
        "schedules_count": len(timetables)
    }


@router.get("/{event_id}/orchestration/assignments")
async def get_assignments(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(EvaluatorAssignment)
        .where(EvaluatorAssignment.event_id == event_id)
        .order_by(EvaluatorAssignment.compatibility_score.desc())
    )
    assignments = result.scalars().all()
    
    output = []
    for ass in assignments:
        evaluator = (await db.execute(select(Evaluator).where(Evaluator.id == ass.evaluator_id))).scalar_one()
        team = (await db.execute(select(Team).where(Team.id == ass.team_id))).scalar_one()
        
        # Load workload
        workload_res = await db.execute(
            select(EvaluatorAssignment).where(EvaluatorAssignment.evaluator_id == ass.evaluator_id)
        )
        workload = len(workload_res.scalars().all())
        
        output.append({
            "assignment_id": str(ass.id),
            "evaluator_id": str(ass.evaluator_id),
            "evaluator_name": evaluator.name,
            "evaluator_domain": evaluator.domain or "General",
            "team_id": str(ass.team_id),
            "team_name": team.name,
            "compatibility_score": float(ass.compatibility_score),
            "reasoning": ass.reasoning,
            "workload": workload
        })
    return output


@router.get("/{event_id}/orchestration/schedule", response_model=ScheduleGridRead)
async def get_schedule(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(EvaluationSchedule)
        .where(EvaluationSchedule.event_id == event_id)
        .order_by(EvaluationSchedule.sequence_order, EvaluationSchedule.room)
    )
    schedules = result.scalars().all()
    
    slots = []
    for s in schedules:
        # Load assignment
        ass = (await db.execute(
            select(EvaluatorAssignment).where(EvaluatorAssignment.id == s.assignment_id)
        )).scalar_one()
        
        evaluator = (await db.execute(select(Evaluator).where(Evaluator.id == ass.evaluator_id))).scalar_one()
        team = (await db.execute(select(Team).where(Team.id == ass.team_id))).scalar_one()
        
        slots.append({
            "team_id": team.id,
            "team_name": team.name,
            "evaluator_id": evaluator.id,
            "evaluator_name": evaluator.name,
            "room": s.room,
            "time_slot": s.time_slot,
            "sequence_order": s.sequence_order
        })
        
    return {
        "event_id": event_id,
        "schedules": slots
    }


@router.put("/{event_id}/orchestration/assignments/{assignment_id}")
async def override_assignment(
    event_id: uuid.UUID,
    assignment_id: uuid.UUID,
    payload: AssignmentOverride,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    Manually overrides an assignment, recalculates compatibility, and logs changes.
    """
    ass = (await db.execute(
        select(EvaluatorAssignment).where(
            EvaluatorAssignment.id == assignment_id,
            EvaluatorAssignment.event_id == event_id
        )
    )).scalar_one_or_none()
    
    if not ass:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    evaluator = (await db.execute(select(Evaluator).where(Evaluator.id == payload.evaluator_id))).scalar_one_or_none()
    team = (await db.execute(select(Team).where(Team.id == payload.team_id))).scalar_one_or_none()
    
    if not evaluator or not team:
        raise HTTPException(status_code=400, detail="Invalid evaluator or team override specification.")
        
    # Get members
    members = (await db.execute(
        select(Participant)
        .join(TeamMember, Participant.id == TeamMember.participant_id)
        .where(TeamMember.team_id == team.id)
    )).scalars().all()
    
    # Calculate score & explainability
    score, reason = matching.compute_compatibility_score(evaluator, members, team.challenge or "")
    
    if score == 0.0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign: Severe institutional conflict of interest detected.")
        
    ass.evaluator_id = payload.evaluator_id
    ass.team_id = payload.team_id
    ass.compatibility_score = score
    ass.reasoning = f"[Manual Override] {reason}"
    
    await db.commit()
    return {"status": "success", "message": "Manual override applied perfectly."}


@router.get("/{event_id}/orchestration/compatibility")
async def get_compatibility_matrix_analytics(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get compatibility heatmap data
    """
    evaluators = (await db.execute(select(Evaluator).where(Evaluator.event_id == event_id))).scalars().all()
    teams = (await db.execute(select(Team).where(Team.event_id == event_id))).scalars().all()
    
    matrix = {}
    for eval in evaluators:
        matrix[eval.name] = {}
        for team in teams:
            members = (await db.execute(
                select(Participant)
                .join(TeamMember, Participant.id == TeamMember.participant_id)
                .where(TeamMember.team_id == team.id)
            )).scalars().all()
            score, reason = matching.compute_compatibility_score(eval, members, team.challenge or "")
            matrix[eval.name][team.name] = [float(score), reason]
            
    return matrix


@router.get("/{event_id}/orchestration/analytics", response_model=OptimizationAnalytics)
async def get_orchestration_analytics(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Optimization engine summary analytics
    """
    evaluators = (await db.execute(select(Evaluator).where(Evaluator.event_id == event_id))).scalars().all()
    teams = (await db.execute(select(Team).where(Team.event_id == event_id))).scalars().all()
    assignments = (await db.execute(select(EvaluatorAssignment).where(EvaluatorAssignment.event_id == event_id))).scalars().all()
    
    total_evals = len(evaluators)
    total_teams = len(teams)
    total_assigns = len(assignments)
    
    avg_compat = 0.0
    min_compat = 100.0
    if assignments:
        avg_compat = sum(float(a.compatibility_score) for a in assignments) / len(assignments)
        min_compat = min(float(a.compatibility_score) for a in assignments)
        
    # Check for unassigned teams
    assigned_team_ids = set(a.team_id for a in assignments)
    unassigned_teams = [t.id for t in teams if t.id not in assigned_team_ids]
    
    # Workload distribution
    workload = {}
    for eval in evaluators:
        eval_assigns = [a for a in assignments if a.evaluator_id == eval.id]
        workload[eval.name] = len(eval_assigns)
        
    return {
        "total_evaluators": total_evals,
        "total_teams": total_teams,
        "total_assignments": total_assigns,
        "average_compatibility": round(avg_compat, 2),
        "min_compatibility": round(min_compat, 2) if assignments else 0.0,
        "unassigned_teams": unassigned_teams,
        "workload_distribution": workload
    }


# ── SWAP OPTIMIZATION SCHEMAS & ENDPOINTS ──────────────────────

from pydantic import BaseModel

class ProposeSwapRequest(BaseModel):
    evaluator_id: uuid.UUID
    team_id: uuid.UUID

class ExecuteSwapRequest(BaseModel):
    evaluator_1_id: uuid.UUID
    team_1_id: uuid.UUID
    evaluator_2_id: uuid.UUID
    team_2_id: uuid.UUID


@router.post("/{event_id}/orchestration/propose-swap")
async def propose_swap(
    event_id: uuid.UUID,
    payload: ProposeSwapRequest,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    Scans all assignments to find other judges/slots that can be safely swapped 
    without institutional conflicts, double-bookings, or availability violations.
    """
    # 1. Fetch current assignment & schedule
    current_ass = (await db.execute(
        select(EvaluatorAssignment).where(
            EvaluatorAssignment.event_id == event_id,
            EvaluatorAssignment.evaluator_id == payload.evaluator_id,
            EvaluatorAssignment.team_id == payload.team_id
        )
    )).scalar_one_or_none()
    
    if not current_ass:
        raise HTTPException(status_code=404, detail="Current assignment not found")
        
    current_sched = (await db.execute(
        select(EvaluationSchedule).where(
            EvaluationSchedule.event_id == event_id,
            EvaluationSchedule.assignment_id == current_ass.id
        )
    )).scalar_one_or_none()
    
    if not current_sched:
        raise HTTPException(status_code=404, detail="Schedule for current assignment not found")

    # 2. Get all other assignments
    all_ass = (await db.execute(
        select(EvaluatorAssignment)
        .where(
            EvaluatorAssignment.event_id == event_id,
            EvaluatorAssignment.id != current_ass.id
        )
    )).scalars().all()
    
    safe_swaps = []
    
    # Load all evaluators
    evaluators_res = await db.execute(select(Evaluator).where(Evaluator.event_id == event_id))
    evaluators = {ev.id: ev for ev in evaluators_res.scalars().all()}
    
    async def get_team_members(team_id: uuid.UUID):
        members_res = await db.execute(
            select(Participant)
            .join(TeamMember, Participant.id == TeamMember.participant_id)
            .where(TeamMember.team_id == team_id)
        )
        return members_res.scalars().all()

    current_evaluator = evaluators[payload.evaluator_id]
    current_team_members = await get_team_members(payload.team_id)
    
    # Pre-calculate period for slot checker
    from app.engines.scheduler import get_slot_period
    current_period = get_slot_period(current_sched.sequence_order - 1, 10, 15)

    for other_ass in all_ass:
        # Don't swap with same evaluator
        if other_ass.evaluator_id == payload.evaluator_id:
            continue
            
        other_sched = (await db.execute(
            select(EvaluationSchedule).where(
                EvaluationSchedule.event_id == event_id,
                EvaluationSchedule.assignment_id == other_ass.id
            )
        )).scalar_one_or_none()
        
        if not other_sched:
            continue
            
        other_evaluator = evaluators[other_ass.evaluator_id]
        other_team_members = await get_team_members(other_ass.team_id)
        other_period = get_slot_period(other_sched.sequence_order - 1, 10, 15)
        
        # Check 1: Institutional Conflicts
        conflict_curr_other = False
        curr_inst = (current_evaluator.institution or "").strip().lower()
        if curr_inst and curr_inst != "industry" and curr_inst != "none":
            for m in other_team_members:
                if (m.institution or "").strip().lower() == curr_inst:
                    conflict_curr_other = True
                    break
        
        conflict_other_curr = False
        other_inst = (other_evaluator.institution or "").strip().lower()
        if other_inst and other_inst != "industry" and other_inst != "none":
            for m in current_team_members:
                if (m.institution or "").strip().lower() == other_inst:
                    conflict_other_curr = True
                    break
                    
        if conflict_curr_other or conflict_other_curr:
            continue
            
        # Check 2: Availability Windows
        curr_avail = current_evaluator.availability or {}
        if not curr_avail.get(other_period, True):
            continue
            
        other_avail = other_evaluator.availability or {}
        if not other_avail.get(current_period, True):
            continue

        # Check 3: Double booking at the swapped slot index
        double_booked_curr = (await db.execute(
            select(EvaluatorAssignment)
            .join(EvaluationSchedule, EvaluationSchedule.assignment_id == EvaluatorAssignment.id)
            .where(
                EvaluatorAssignment.evaluator_id == current_evaluator.id,
                EvaluationSchedule.sequence_order == other_sched.sequence_order,
                EvaluatorAssignment.id != other_ass.id
            )
        )).scalars().first()
        
        double_booked_other = (await db.execute(
            select(EvaluatorAssignment)
            .join(EvaluationSchedule, EvaluationSchedule.assignment_id == EvaluatorAssignment.id)
            .where(
                EvaluatorAssignment.evaluator_id == other_evaluator.id,
                EvaluationSchedule.sequence_order == current_sched.sequence_order,
                EvaluatorAssignment.id != current_ass.id
            )
        )).scalars().first()
        
        if double_booked_curr or double_booked_other:
            continue
            
        # Calculate swap gains
        other_team = (await db.execute(select(Team).where(Team.id == other_ass.team_id))).scalar_one()
        current_team = (await db.execute(select(Team).where(Team.id == payload.team_id))).scalar_one()
        
        score_curr_other, _ = matching.compute_compatibility_score(current_evaluator, other_team_members, other_team.challenge or "")
        score_other_curr, _ = matching.compute_compatibility_score(other_evaluator, current_team_members, current_team.challenge or "")
        
        safe_swaps.append({
            "target_evaluator_id": str(other_evaluator.id),
            "target_evaluator_name": other_evaluator.name,
            "target_team_id": str(other_team.id),
            "target_team_name": other_team.name,
            "time_slot": other_sched.time_slot,
            "room": other_sched.room,
            "compatibility_gain": round((score_curr_other + score_other_curr) - (float(current_ass.compatibility_score) + float(other_ass.compatibility_score)), 2)
        })
        
    return safe_swaps


@router.post("/{event_id}/orchestration/execute-swap")
async def execute_swap(
    event_id: uuid.UUID,
    payload: ExecuteSwapRequest,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    """
    Executes a swap between two evaluator assignments, recalculating compatibility scores.
    """
    ass1 = (await db.execute(
        select(EvaluatorAssignment).where(
            EvaluatorAssignment.event_id == event_id,
            EvaluatorAssignment.evaluator_id == payload.evaluator_1_id,
            EvaluatorAssignment.team_id == payload.team_1_id
        )
    )).scalar_one_or_none()
    
    ass2 = (await db.execute(
        select(EvaluatorAssignment).where(
            EvaluatorAssignment.event_id == event_id,
            EvaluatorAssignment.evaluator_id == payload.evaluator_2_id,
            EvaluatorAssignment.team_id == payload.team_2_id
        )
    )).scalar_one_or_none()
    
    if not ass1 or not ass2:
        raise HTTPException(status_code=404, detail="One or both assignments not found")
        
    # Swapping
    ass1.evaluator_id = payload.evaluator_2_id
    ass2.evaluator_id = payload.evaluator_1_id
    
    evaluators_res = await db.execute(select(Evaluator).where(Evaluator.event_id == event_id))
    evaluators = {ev.id: ev for ev in evaluators_res.scalars().all()}
    
    async def get_team_members(team_id: uuid.UUID):
        members_res = await db.execute(
            select(Participant)
            .join(TeamMember, Participant.id == TeamMember.participant_id)
            .where(TeamMember.team_id == team_id)
        )
        return members_res.scalars().all()

    members1 = await get_team_members(payload.team_1_id)
    members2 = await get_team_members(payload.team_2_id)
    
    team1 = (await db.execute(select(Team).where(Team.id == payload.team_1_id))).scalar_one()
    team2 = (await db.execute(select(Team).where(Team.id == payload.team_2_id))).scalar_one()
    
    score1, reason1 = matching.compute_compatibility_score(evaluators[payload.evaluator_2_id], members1, team1.challenge or "")
    score2, reason2 = matching.compute_compatibility_score(evaluators[payload.evaluator_1_id], members2, team2.challenge or "")
    
    ass1.compatibility_score = score1
    ass1.reasoning = f"[Swapped] {reason1}"
    
    ass2.compatibility_score = score2
    ass2.reasoning = f"[Swapped] {reason2}"
    
    await db.commit()
    return {"status": "success", "message": "Assignments successfully swapped."}


# ── LIVE COMMITTEE DASHBOARD METRICS SUMMARY APENDIX ──────────────────

@router.get("/{event_id}/summary", status_code=200)
async def get_live_committee_dashboard_metrics(
    event_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db)
):
    """
    Executes composite pipeline queries across the database schema 
    to feed live structural telemetry counts straight into the main Dashboard layout.
    """
    try:
        # 1. Total Registered/Active Participants
        stmt_part = select(func.count()).select_from(Participant).where(Participant.event_id == event_id)
        res_part = await db.execute(stmt_part)
        total_participants = res_part.scalar() or 0

        # 2. Team Approval Queue Count (Status checking matching "proposed")
        stmt_appr = select(func.count()).select_from(Team).where(
            Team.event_id == event_id,
            Team.approval_status == 'proposed'
        )
        res_appr = await db.execute(stmt_appr)
        pending_approvals = res_appr.scalar() or 0

        # 3. Active Divergence Flag Alert Checks (From the scores table)
        stmt_anom = select(func.count()).select_from(Score).join(Team).where(
            Team.event_id == event_id,
            Score.flagged == True
        )
        res_anom = await db.execute(stmt_anom)
        anomalies_count = res_anom.scalar() or 0

        # 4. Compute Dynamic Evaluation Matrix Progression Rates
        stmt_total_teams = select(func.count()).select_from(Team).where(Team.event_id == event_id)
        stmt_done_teams = select(func.count()).select_from(Team).where(
            Team.event_id == event_id,
            Team.evaluation_status == 'completed'
        )
        
        total_teams = (await db.execute(stmt_total_teams)).scalar() or 0
        done_teams = (await db.execute(stmt_done_teams)).scalar() or 0
        
        progress_pct = "0%"
        if total_teams > 0:
            progress_pct = f"{int((done_teams / total_teams) * 100)}%"

        return {
            "totalParticipants": total_participants,
            "pendingApprovals": pending_approvals,
            "evaluationStatus": progress_pct,
            "anomaliesCount": anomalies_count
        }

    except Exception as e:
        logger.error(f"Failed to gather real-time telemetry metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Telemetry assembly failed: {str(e)}"
        )