import uuid
import asyncio  # 🎯 FIXED: Added missing import for your anti-flooding sleep check
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from anyio import to_thread
from app.services.activity_log import log_action

from app.db.session import get_db
from app.models.event import Event
from app.models.stage import Stage
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.participant import Participant
from app.models.delivery_log import DeliveryLog
from app.models.evaluator_assignment import EvaluatorAssignment
from app.models.finalized_team import FinalizedTeam
from ai_app.tasks.llm_tasks import send_individual_welcome_email
# 🎯 FIXED: Cleaned up schema imports (removed worker task function)
from app.schemas.event import EventCreate, EventRead, EventUpdate, TargetedAnnouncementPayload
from app.schemas.common import StageRead, MessageResponse
from app.utils.stages_utils import activate_stage, complete_stage, create_system_announcement
from app.models.approval_gate import ApprovalGate
from app.core.dependencies import get_current_committee_member


router = APIRouter()

@router.post("", response_model=EventRead)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db), member=Depends(get_current_committee_member),):
    try:
        event = Event(
            name=payload.name,
            event_type=payload.event_type,
            created_by=member.id,
        )
        db.add(event)
        await db.flush()

        # Seed the 13 fixed pipeline stages
        # name, description, sequence_order, approval_required, is_committee_visible
        pipeline = [
            ('Participant Intake',      'Load and verify participant roster via CSV upload', 1, False, True),
            ('Team Formation',          'Algorithmically form teams and generate LLM rationale', 2, True, True),
            ('Team Review & Approval', 'Review teams and approve them and Send welcome and team assignment emails to participants', 3, True, True),
            ('Mentor Assignment',      'Mentors are allocated to approved teams', 4, True, True),
            ('Build Phase',            'Teams work on developing their projects', 5,  True, True),
            ('Evaluation',             'Judges(evaluators) score each team via dedicated evaluator interface', 6, False, True),
            ('Final Result',           'Final results published and event closed', 7, False, True),
            ('Team Connect',           'Connect with your teammates and get familiar with them', 1, False, False),
            ('Mentor Connect',         'Connect with your mentor ', 2, False, False),
            ('Build Phase',            'Build your project', 3, False, False),
            ('Submission',             'Submit your code, video and PPT before the deadline', 4, False, False),
            ('Evaluation',             'Projects are being reviewed and scored by the evaluators', 5, False, False),
            ('Final Result',           'Rankings and winners announced', 6, False, False)
        ]
        for name, desc, order, approval, cvisible in pipeline:
            db.add(Stage(
                event_id=event.id,
                name=name,
                description=desc,
                sequence_order=order,
                approval_required=approval,
                is_committee_visible=cvisible,
                is_participant_visible=not cvisible,
                status="active" if cvisible == True and order == 1 else "upcoming",
                started_at=datetime.now(timezone.utc) if cvisible == True and order == 1 else None
            ))

        # Activate next committee stage
        next_c_stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event.id,
                Stage.sequence_order == 1,
                Stage.is_committee_visible == True
            )
        )

        next_c_stage = next_c_stage_result.scalar_one_or_none()

        if next_c_stage:
            activate_stage(next_c_stage)
            event.current_committee_stage = next_c_stage.name


        await log_action(
            db=db,
            event_id=event.id,
            action_type="Event Creation",
            action="Event has been created successfully",
            actor="Committee Admin",
            meta=None
        )

        await db.commit()
        await db.refresh(event)
        return event


    except Exception as db_err:
        await db.rollback()
        print(f"❌ CRITICAL DATABASE EXCEPTION: {str(db_err)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to provision workspace records database container: {str(db_err)}"
        )


@router.get("", response_model=List[EventRead])
async def list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).order_by(Event.created_at.desc()))
    return result.scalars().all()


@router.get("/{event_id}", response_model=EventRead)
async def get_event(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_current_committee_member)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if payload.name is not None:
        event.name = payload.name
    if payload.event_type is not None:
        event.event_type = payload.event_type
    if payload.stage_config is not None:
        event.stage_config = payload.stage_config
        
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/{event_id}/stages", response_model=List[StageRead])
async def get_stages(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stage)
        .where(Stage.event_id == event_id)
        .order_by(Stage.sequence_order)
    )
    return result.scalars().all()


@router.get("/{event_id}/committee-stages", response_model=List[StageRead])
async def get_committee_stages(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stage)
        .where(Stage.event_id == event_id)
        .where(Stage.is_committee_visible == True)
        .order_by(Stage.sequence_order)
    )
    return result.scalars().all()


@router.get("/{event_id}/finalized-teams")
async def get_event_finalized_teams(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Clean up orphaned finalized teams left over from previous database resets/partially cleared runs
    from sqlalchemy import delete
    subq = select(Team.id).where(Team.event_id == event_id)
    await db.execute(
        delete(FinalizedTeam)
        .where(FinalizedTeam.event_id == event_id)
        .where(~FinalizedTeam.team_id.in_(subq))
    )
    await db.commit()

    result = await db.execute(
        select(FinalizedTeam)
        .where(FinalizedTeam.event_id == event_id)
        .order_by(FinalizedTeam.name)
    )
    teams = result.scalars().all()
    return teams


@router.post("/{event_id}/teams/{team_id}/approve", response_model=MessageResponse)
async def approve_single_team(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.event_id == event_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team context not found.")

    team.approval_status = "approved"
    await db.commit()
    return {
        "message": f"Team '{team.name}' approved successfully.",
        "detail": "UI count can now safely increment."
    }


@router.post("/{event_id}/teams/{team_id}/reject", response_model=MessageResponse)
async def reject_single_team(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.event_id == event_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team context not found.")

    team.approval_status = "rejected"
    await db.commit()
    return {
        "message": f"Team '{team.name}' rejected successfully.",
        "detail": "UI count will update metrics appropriately."
    }


@router.post("/{event_id}/approve-stage", response_model=MessageResponse)
async def approve_entire_stage(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    teams_result = await db.execute(
        select(Team).where(Team.event_id == event_id, Team.approval_status == "approved")
    )
    approved_teams = teams_result.scalars().all()
    
    if not approved_teams:
        raise HTTPException(
            status_code=400, 
            detail="No approved teams found! Please approve individual cards first."
        )

    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one()

    for team in approved_teams:
        chk = await db.execute(select(FinalizedTeam).where(FinalizedTeam.team_id == team.id))
        if chk.scalar_one_or_none():
            continue

        members_result = await db.execute(
            select(Participant)
            .join(TeamMember, Participant.id == TeamMember.participant_id)
            .where(TeamMember.team_id == team.id)
        )
        participants = members_result.scalars().all()

        snapshot = [
            {"id": str(p.id), "name": f"{p.first_name} {p.last_name or ''}".strip(), "email": p.email, "institution": p.institution, "skill_tags": p.skill_tags or [],}
            for p in participants
        ]

        db.add(FinalizedTeam(
            event_id=event_id,
            team_id=team.id,
            name=team.name,
            challenge=getattr(team, 'challenge', None),
            llm_rationale=team.llm_rationale,
            members_snapshot=snapshot
        ))


    await log_action(
        db=db,
        event_id=event.id,
        action_type="Team Review & Approval done",
        action="Team compositions approved by committee",
        actor="Admin Portal",
        meta=None
    )

    
    # COMPLETE Team Review & Approval STAGE for committee
    current_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 3,
            Stage.is_committee_visible == True
        )
    )
    current_stage = current_stage_result.scalar_one_or_none()

    if current_stage:
        complete_stage(current_stage)

    # ACTIVATE Mentor Assignment for committee
    next_c_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 4,
            Stage.is_committee_visible == True
        )
    )
    next_c_stage = next_c_stage_result.scalar_one_or_none()

    if next_c_stage:
        activate_stage(next_c_stage)
        event.current_committee_stage = next_c_stage.name

    
    # Mark stage Team Connect active for participant
    next_p_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 1,
            Stage.is_committee_visible == False
        )
    )
    next_p_stage = next_p_stage_result.scalar_one_or_none()
    if next_p_stage:
        activate_stage(next_p_stage)
        event.current_participant_stage = next_p_stage.name

        # Auto announcement
        await create_system_announcement(
            db=db,
            event_id=event_id,
            title="Your Team is Ready 🚀",
            message=f"Your team has been formed successfully. Connect with your teammates and start planning your project.",
            type="info"
        )

    await db.commit()
    return {
        "message": "Stage finalized successfully.",
        "detail": "Data snapshotted to finalized_teams. Pipeline shifted to Mentor Assignment."
    }


@router.get("/{event_id}/summary")
async def get_committee_summary(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    try:
        p_res = await db.execute(
            select(func.count()).select_from(Participant).where(Participant.event_id == event_id)
        )
        total_participants = p_res.scalar() or 0

        teams_res = await db.execute(
            select(Team.approval_status, func.count())
            .where(Team.event_id == event_id)
            .group_by(Team.approval_status)
        )
        status_counts = dict(teams_res.fetchall())
        
        pending_approvals = status_counts.get("proposed", 0)
        approved_teams = status_counts.get("approved", 0)
        rejected_teams = status_counts.get("rejected", 0)

        anom_res = await db.execute(
            text("SELECT COUNT(*) FROM score_anomalies WHERE event_id = :eid"),
            {"eid": event_id}
        )
        anomalies_count = anom_res.scalar() or 0

        total_teams_res = await db.execute(
            select(func.count()).select_from(FinalizedTeam).where(FinalizedTeam.event_id == event_id)
        )
        total_teams = total_teams_res.scalar() or 0
        
        scored_teams_res = await db.execute(
            text("""
                SELECT COUNT(DISTINCT s.team_id) 
                FROM scores s
                JOIN finalized_teams f ON s.team_id = f.team_id
                WHERE f.event_id = :eid
            """),
            {"eid": event_id}
        )
        scored_teams = scored_teams_res.scalar() or 0

        assignment_total_res = await db.execute(
            select(func.count()).select_from(EvaluatorAssignment).where(EvaluatorAssignment.event_id == event_id)
        )
        total_assignments = assignment_total_res.scalar() or 0

        scored_assignments_res = await db.execute(
            text("""
                SELECT COUNT(DISTINCT (s.team_id, s.evaluator_id))
                FROM scores s
                JOIN evaluator_assignments ea
                  ON ea.team_id = s.team_id
                 AND ea.evaluator_id = s.evaluator_id
                WHERE ea.event_id = :eid
            """),
            {"eid": event_id}
        )
        scored_assignments = scored_assignments_res.scalar() or 0

        total_evaluations = total_assignments or total_teams
        evaluated_count = scored_assignments or scored_teams
        pending_count = max(total_evaluations - evaluated_count, 0)
        not_started = max(total_teams - scored_teams, 0) if total_teams else pending_count

        progress_percentage = 0
        if total_evaluations > 0:
            progress_percentage = int((evaluated_count / total_evaluations) * 100)

        if total_assignments > 0:
            judge_rows_res = await db.execute(
                text("""
                    SELECT
                        e.name AS name,
                        COUNT(ea.id) AS assigned_count,
                        COUNT(DISTINCT s.id) AS completed_count
                    FROM evaluators e
                    LEFT JOIN evaluator_assignments ea
                      ON ea.evaluator_id = e.id
                     AND ea.event_id = :eid
                    LEFT JOIN scores s
                      ON s.evaluator_id = e.id
                     AND s.team_id = ea.team_id
                    WHERE e.event_id = :eid
                    GROUP BY e.id, e.name
                    ORDER BY e.name
                    LIMIT 6
                """),
                {"eid": event_id}
            )
            judge_progress = []
            for row in judge_rows_res.mappings().all():
                assigned = row["assigned_count"] or 0
                completed = row["completed_count"] or 0
                judge_progress.append({
                    "name": row["name"],
                    "value": int((completed / assigned) * 100) if assigned else 0,
                    "count": f"{completed} / {assigned}"
                })
        else:
            from app.models.evaluator import Evaluator
            from app.models.score import Score
            
            evaluators_res = await db.execute(
                select(Evaluator).where(Evaluator.event_id == event_id).order_by(Evaluator.name)
            )
            evaluators = evaluators_res.scalars().all()

            finalized_teams_res = await db.execute(
                select(FinalizedTeam).where(FinalizedTeam.event_id == event_id)
            )
            finalized_teams = finalized_teams_res.scalars().all()

            scores_res = await db.execute(
                select(Score)
                .join(Team, Score.team_id == Team.id)
                .where(Team.event_id == event_id)
            )
            scores = scores_res.scalars().all()
            completed_scores = {(s.evaluator_id, s.team_id) for s in scores}

            judge_progress = []
            for evaluator in evaluators[:6]:
                assigned = 0
                completed = 0
                for ft in finalized_teams:
                    scores_snapshot = ft.scores_snapshot or []
                    is_assigned = False
                    for sheet in scores_snapshot:
                        if sheet.get("judge_name") == evaluator.name:
                            is_assigned = True
                            break
                    
                    if is_assigned:
                        assigned += 1
                        if (evaluator.id, ft.team_id) in completed_scores:
                            completed += 1
                
                judge_progress.append({
                    "name": evaluator.name,
                    "value": int((completed / assigned) * 100) if assigned else 0,
                    "count": f"{completed} / {assigned}"
                })

        stage_res = await db.execute(
            select(Stage)
            .where(Stage.event_id == event_id, Stage.is_committee_visible == True)
            .order_by(Stage.sequence_order)
        )
        stages = [
            {
                "label": stage.name,
                "status": stage.status,
                "sequence": stage.sequence_order,
                "description": stage.description
            }
            for stage in stage_res.scalars().all()
        ]

        delivery_res = await db.execute(
            select(DeliveryLog.status, func.count())
            .where(DeliveryLog.event_id == event_id)
            .group_by(DeliveryLog.status)
        )
        delivery_counts = {str(status or "Pending").lower(): count for status, count in delivery_res.fetchall()}

        event_res = await db.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()

        return {
            "totalParticipants": total_participants,
            "pendingApprovals": pending_approvals,
            "approvedTeams": approved_teams,
            "rejectedTeams": rejected_teams,
            "evaluationStatus": f"{progress_percentage}%",
            "evaluationOverview": {
                "evaluated": evaluated_count,
                "pending": pending_count,
                "notStarted": not_started,
                "totalEvaluations": total_evaluations,
                "overallPercent": progress_percentage
            },
            "judgeProgress": judge_progress,
            "stages": stages,
            "currentStage": event.current_committee_stage if event else None,
            "is_submission_open": event.is_submission_open if event else False,
            "communicationStatus": {
                "delivered": delivery_counts.get("delivered", 0),
                "pending": delivery_counts.get("pending", 0),
                "failed": delivery_counts.get("failed", 0) + delivery_counts.get("bounced", 0),
                "total": sum(delivery_counts.values())
            },
            "anomaliesCount": anomalies_count
        }
        
    except Exception as e:
        print(f"❌ Telemetry aggregation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server metric collation breakdown.")


@router.post("/{event_id}/advance-stage", response_model=MessageResponse)
async def advance_committee_stage(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    stages_result = await db.execute(
        select(Stage)
        .where(Stage.event_id == event_id, Stage.is_committee_visible == True)
        .order_by(Stage.sequence_order)
    )
    stages = stages_result.scalars().all()
    if not stages:
        raise HTTPException(status_code=404, detail="No committee stages found for this event")

    active_index = next((index for index, stage in enumerate(stages) if stage.status in ["active", "awaiting_approval"]), None)
    if active_index is None:
        active_index = next((index for index, stage in enumerate(stages) if stage.name == event.current_committee_stage), None)
    if active_index is None:
        active_index = 0

    current_stage = stages[active_index]
    if current_stage.status != "complete":
        complete_stage(current_stage)


    if active_index == 5:
        # Mark Evaluation stage as completed for participant
        stage_p_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 5,
                Stage.is_committee_visible == False
            )
        )
        current_p_stage = stage_p_result.scalar_one_or_none()
        if current_p_stage and current_p_stage.status != "completed":
            complete_stage(current_p_stage)

            await create_system_announcement(
                db=db,
                event_id=event_id,
                title="Evaluation Completed 📊",
                message=f"The judging process has been completed. Final results will be announced soon.",
                type="info"
            )

        # Activate next Result stage for participant
        next_p_stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 6,
                Stage.is_committee_visible == False
            )
        )
        next_p_stage = next_p_stage_result.scalar_one_or_none()
        if next_p_stage and next_p_stage.status == "upcoming":
            activate_stage(next_p_stage)
            event.current_participant_stage = next_p_stage.name

            await create_system_announcement(
                db=db,
                event_id=event_id,
                title="Results Announced 🏆",
                message=f"The final results are now live. Check the leaderboard for rankings and winners.",
                type="info"
            )

    if active_index == 6:
        # Mark Result as completed for participant
        stage_p_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 6,
                Stage.is_committee_visible == False
            )
        )
        current_p_stage = stage_p_result.scalar_one_or_none()
        if current_p_stage and current_p_stage.status != "completed":
            complete_stage(current_p_stage)

            await create_system_announcement(
                db=db,
                event_id=event_id,
                title="Hackathon Concluded 🎊",
                message=f" The event has officially concluded. Thank you for participating!",
                type="info"
            )

    if active_index + 1 >= len(stages):
        event.current_committee_stage = current_stage.name
        await db.commit()
        return {"message": "Event is already at the final committee stage.", "detail": current_stage.name}

    next_stage = stages[active_index + 1]
    activate_stage(next_stage)
    event.current_committee_stage = next_stage.name

    await log_action(
        db=db,
        event_id=event_id,
        action_type="System",
        action=f"Pipeline advanced to stage: {next_stage.name}",
        actor="Admin Portal",
        meta={"previous_stage": current_stage.name}
    )
    await db.commit()
    return {
        "message": f"Advanced committee workflow to {next_stage.name}.",
        "detail": f"{current_stage.name} marked complete."
    }


@router.get("/{event_id}/approvals/pending", response_model=List[dict])
async def get_dashboard_pending_queue(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Team).where(Team.event_id == event_id, Team.approval_status == "proposed").limit(3)
    )
    teams = result.scalars().all()
    
    queue_stream = []
    for t in teams:
        queue_stream.append({
            "type": "team_approval",
            "item": f"Review structural layout for team: {t.name}"
        })
        
    return queue_stream


@router.get("/{event_id}/leaderboard", response_model=List[dict])
async def get_event_leaderboard_preview(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FinalizedTeam)
        .where(FinalizedTeam.event_id == event_id)
        .order_by(FinalizedTeam.final_calculated_total.desc())
        .limit(3)
    )
    teams = result.scalars().all()
    
    leaderboard = []
    for index, team in enumerate(teams):
        leaderboard.append({
            "rank": index + 1,
            "team": team.name,
            "total": float(team.final_calculated_total or 0.0)
        })
    return leaderboard


@router.post("/{event_id}/send-targeted-announcements", response_model=MessageResponse)
async def send_targeted_announcements(
    event_id: uuid.UUID, 
    payload: TargetedAnnouncementPayload,  
    db: AsyncSession = Depends(get_db)
):
    stmt = select(FinalizedTeam).where(FinalizedTeam.event_id == event_id)
    
    if payload.team_id:
        stmt = stmt.where(FinalizedTeam.team_id == payload.team_id)
        
    result = await db.execute(stmt)
    targeted_teams = result.scalars().all()

    if not targeted_teams:
        raise HTTPException(
            status_code=404, 
            detail="No matching finalized team records located for this selection payload."
        )

    rank_lookup = {}
    if payload.include_leaderboard_context:
        rank_stmt = (
            select(FinalizedTeam.team_id)
            .where(FinalizedTeam.event_id == event_id)
            .order_by(FinalizedTeam.final_calculated_total.desc())
        )
        rank_result = await db.execute(rank_stmt)
        all_ordered_ids = rank_result.scalars().all()
        rank_lookup = {team_uuid: index + 1 for index, team_uuid in enumerate(all_ordered_ids)}

    email_count = 0

    for target_team in targeted_teams:
        members = target_team.members_snapshot or []
        if isinstance(members, str):
            import json
            try:
                members = json.loads(members)
            except json.JSONDecodeError:
                members = []
        
        base_rationale = target_team.llm_rationale or "Your combination of skills sets your team up for success!"
        
        if payload.include_leaderboard_context and target_team.team_id in rank_lookup:
            current_rank = rank_lookup[target_team.team_id]
            leaderboard_snippet = f"🏆 Leaderboard Update: Your team is currently ranked #{current_rank} overall!"
            rationale_text = f"{leaderboard_snippet} | {base_rationale}"
        else:
            rationale_text = base_rationale

        member_list = [f"{m['name']} ({m['email']})" for m in members if 'name' in m and 'email' in m]

        for current_member in members:
            if 'email' not in current_member or 'name' not in current_member:
                continue

            teammates = [m for m in member_list if f"({current_member['email']})" not in m]
            teammates_list_str = ", ".join(teammates) if teammates else "Your remaining teammates are being assigned shortly!"
            
            try:
                first_name = current_member['name'].split()[0]
            except (IndexError, AttributeError):
                first_name = "Innovator"

            custom_subject = payload.subject if payload.subject else f"📊 [{target_team.name}] Performance Updates & Leaderboard Notice"
            custom_body = payload.body if payload.body else ""

            send_individual_welcome_email.apply_async(
                kwargs={
                    "event_id": str(event_id),                                                                                    
                    "recipient_name": current_member['name'],    
                    "recipient_email": current_member['email'],  
                    "first_name": first_name,
                    "team_name": target_team.name,
                    "rationale": rationale_text,  
                    "teammates": teammates_list_str,
                    "custom_subject": custom_subject,
                    "custom_body": custom_body  
                },
                queue="llm_queue"
            )
            
            email_count += 1
            
            if email_count % 10 == 0:
                await asyncio.sleep(0.01) # 🎯 FIXED: This will now run perfectly because asyncio is imported

    return {
        "message": f"Successfully completed selective distribution. Scheduled {email_count} isolated target email variants.",
        "detail": "Asynchronous tasks dispatched cleanly to workers using customized metadata filters."
    }