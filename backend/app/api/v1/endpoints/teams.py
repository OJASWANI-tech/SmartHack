from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.participant import Participant
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.stage import Stage
from app.models.approval_gate import ApprovalGate
from app.models.event import Event
from app.schemas.team import TeamRead, TeamFormationConfig
from app.schemas.common import MessageResponse
from typing import List, Dict, Any, Union
import uuid
import random
from collections import Counter
from app.models.finalized_team import FinalizedTeam 
from app.utils.stages_utils import activate_stage, complete_stage
from celery.exceptions import TimeoutError
from pydantic import BaseModel, Field
from pydantic import field_validator 
from app.services.activity_log import log_action

# Import verified Celery background tasks
from ai_app.tasks.llm_tasks import generate_team_rationale, send_individual_welcome_email

router = APIRouter()

# =====================================================================
# 📋 LENIENT SCHEMAS 
# =====================================================================
class StagingTeamMember(BaseModel):
    name: str
    institution: str
    experience_years: Union[int, str, None] = 0
    skills: Union[List[str], str, None] = Field(default_factory=list)

    @field_validator("experience_years", mode="before")
    @classmethod
    def coerce_experience_years(cls, v):
        if not v or str(v).strip() == "":
            return 0
        try:
            return int(float(str(v).strip()))
        except ValueError:
            return 0

    @field_validator("skills", mode="before")
    @classmethod
    def coerce_skills_list(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            return [skill.strip() for skill in v.split(",") if skill.strip()]
        if isinstance(v, list):
            return [str(item).strip() for item in v if item]
        return []

class TeamRationaleRequest(BaseModel):
    team_id: Union[uuid.UUID, str, Any]
    team_name: str
    members: List[StagingTeamMember]

# NEW SCHEMA for Track Selection
class TrackSelectionRequest(BaseModel):
    challenge: str


# =====================================================================
# ⚙️ CORE TEAM FORMATION UTILS
# =====================================================================
def form_teams_constrained(participants: List[Participant], config: TeamFormationConfig) -> List[List[Participant]]:
    team_size = config.team_size or 4
    max_per_institution = config.max_per_institution if getattr(config, 'institutionLimitEnabled', False) else None
    
    skills_config = getattr(config, 'skills', {})
    if hasattr(skills_config, "model_dump"):
        skills_config = skills_config.model_dump()
    elif hasattr(skills_config, "dict"):
        skills_config = skills_config.dict()
        
    enforce_skills = skills_config.get('enabled', True)
    min_devs = skills_config.get('minDevelopers', 0)
    min_des = skills_config.get('minDesigners', 0)
    min_biz = skills_config.get('minBusiness', 0)

    exp_config = getattr(config, 'experience', {})
    if hasattr(exp_config, "model_dump"):
        exp_config = exp_config.model_dump()
    elif hasattr(exp_config, "dict"):
        exp_config = exp_config.dict()

    enforce_exp = exp_config.get('enabled', True)
    max_experts = exp_config.get('maxExperts', team_size)
    min_beginners = exp_config.get('minBeginners', 0)

    dev_pool = [p for p in participants if (p.domain or '').lower() in ['ai', 'developer', 'data', 'devs', 'artificial intelligence & machine learning']]
    design_pool = [p for p in participants if (p.domain or '').lower() in ['design', 'ux', 'ui', 'designer', 'healthtech & digital patient care']]
    biz_pool = [p for p in participants if (p.domain or '').lower() in ['business', 'pm', 'general', 'biz', 'fintech & decentralized payments']]
    
    assigned_ids = {p.id for p in dev_pool + design_pool + biz_pool}
    remainder_pool = [p for p in participants if p.id not in assigned_ids]

    randomization_factor = getattr(config, 'randomizationFactor', 100) / 100.0

    def apply_diversity_buffer(pool: list, factor: float) -> list:
        if factor <= 0:
            return pool
        pool_copy = list(pool)
        split_idx = int(len(pool_copy) * factor)
        
        shuffle_slice = pool_copy[:split_idx]
        stable_slice = pool_copy[split_idx:]
        random.shuffle(shuffle_slice)
        return shuffle_slice + stable_slice

    dev_pool = apply_diversity_buffer(dev_pool, randomization_factor)
    design_pool = apply_diversity_buffer(design_pool, randomization_factor)
    biz_pool = apply_diversity_buffer(biz_pool, randomization_factor)
    remainder_pool = apply_diversity_buffer(remainder_pool, randomization_factor)

    total_participants = len(participants)
    target_team_count = max(1, total_participants // team_size)
    
    teams: List[List[Participant]] = [[] for _ in range(target_team_count)]
    institution_counts: List[Dict[str, int]] = [{} for _ in range(target_team_count)]

    def can_add_to_team(participant: Participant, team_idx: int) -> bool:
        if len(teams[team_idx]) >= team_size:
            return False
            
        if max_per_institution and participant.institution:
            inst_clean = participant.institution.strip().lower()
            current_count = institution_counts[team_idx].get(inst_clean, 0)
            if current_count >= max_per_institution:
                return False
        
        if enforce_exp and participant.experience_level == "advanced":
            expert_count = sum(1 for p in teams[team_idx] if p.experience_level == "advanced")
            if expert_count >= max_experts:
                return False

        return True

    for role_pool, min_count in [(dev_pool, min_devs), (design_pool, min_des), (biz_pool, min_biz)]:
        for _ in range(min_count):
            for team_idx in range(target_team_count):
                for i, p in enumerate(role_pool):
                    if can_add_to_team(p, team_idx):
                        teams[team_idx].append(role_pool.pop(i))
                        if p.institution:
                            inst = p.institution.strip().lower()
                            institution_counts[team_idx][inst] = institution_counts[team_idx].get(inst, 0) + 1
                        break

    leftovers = dev_pool + design_pool + biz_pool + remainder_pool
    if enforce_exp:
        leftovers.sort(key=lambda x: 0 if x.experience_level == "advanced" else (1 if x.experience_level == "intermediate" else 2))

    for p in leftovers:
        placed = False
        for team_idx in range(target_team_count):
            if can_add_to_team(p, team_idx):
                teams[team_idx].append(p)
                if p.institution:
                    inst = p.institution.strip().lower()
                    institution_counts[team_idx][inst] = institution_counts[team_idx].get(inst, 0) + 1
                placed = True
                break
        
        if not placed:
            for team_idx in range(target_team_count):
                if len(teams[team_idx]) < team_size:
                    teams[team_idx].append(p)
                    break

    return [t for t in teams if t]


# =====================================================================
# 📡 ROUTE ENDPOINTS
# =====================================================================
@router.post("/{event_id}/form-teams", response_model=MessageResponse)
async def form_teams_endpoint(
    event_id: uuid.UUID,
    config: TeamFormationConfig,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    result = await db.execute(
        select(Participant).where(Participant.event_id == event_id)
    )
    participants = result.scalars().all()

    if len(participants) < config.team_size:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough participants. Need at least {config.team_size}."
        )

    result = await db.execute(select(Team).where(Team.event_id == event_id))
    existing_teams = result.scalars().all()
    for t in existing_teams:
        await db.delete(t)
    await db.flush()

    grouped = form_teams_constrained(participants, config)

    team_names = [
        "Alpha", "Beta", "Gamma", "Delta", "Epsilon",
        "Zeta", "Eta", "Theta", "Iota", "Kappa",
        "Lambda", "Mu", "Nu", "Xi", "Omicron",
        "Pi", "Rho", "Sigma", "Tau", "Upsilon",
    ]

    for i, members in enumerate(grouped):
        team_name = f"Team {team_names[i]}" if i < len(team_names) else f"Team {i+1}"
        
        member_dicts = [
            {
                "name": f"{m.first_name} {m.last_name}",
                "skills": m.skill_tags if m.skill_tags is not None else [],
                "domain": m.domain or "General",
                "institution": m.institution or "Unknown Institution",
                "experience_years": 3 if m.experience_level == "advanced" else (2 if m.experience_level == "intermediate" else 1)
            }
            for m in members
        ]
         
        # 🎯 FORCE TEAMS TO MANUALLY SELECT TRACK IN THE PARTICIPANT DASHBOARD
        assigned_domain = "Pending Selection"
        
        team = Team(
            id=uuid.uuid4(),  
            event_id=event_id,
            name=team_name,
            challenge=assigned_domain,  
            llm_rationale=None,
            approval_status="proposed",
        )
        db.add(team)  

        generate_team_rationale.apply_async(
            kwargs={
                'team_id': str(team.id),
                'team_name': team_name,
                'team_members': member_dicts
            },
            queue='llm_queue'
        )

        for member in members:
            db.add(TeamMember(team_id=team.id, participant_id=member.id))

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Matching",
        action="Teams formed algorithmically using distribution rules",
        actor="AI Optimization",
        meta=None
    )

    current_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 2,
            Stage.is_committee_visible == True
        )
    )
    current_stage = current_stage_result.scalar_one_or_none()
    if current_stage:
        complete_stage(current_stage)

    next_c_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 3,
            Stage.is_committee_visible == True
        )
    )
    next_c_stage = next_c_stage_result.scalar_one_or_none()
    if next_c_stage:
        activate_stage(next_c_stage)
        event.current_committee_stage = next_c_stage.name
        
    db.add(ApprovalGate(
        event_id=event_id,
        gate_type="team_formation",
        status="pending",
        action_payload={"team_count": len(grouped), "config": config.model_dump()},
    ))

    await db.commit()
    return {
        "message": f"{len(grouped)} teams formed successfully. AI rationales are processing.",
        "detail": f"Teams will select their own tracks via the participant dashboard."
    }


@router.get("/{event_id}/teams")
async def list_teams(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Team)
        .where(Team.event_id == event_id)
        .options(
            selectinload(Team.members).selectinload(TeamMember.participant)
        )
        .order_by(Team.created_at)
    )
    db_teams = result.scalars().all()
    
    response_payload = []
    for team in db_teams:
        members_list = []
        for tm in team.members:
            if tm.participant:
                p = tm.participant
                members_list.append({
                    "id": str(p.id),
                    "first_name": p.first_name,
                    "last_name": p.last_name,
                    "name": f"{p.first_name} {p.last_name}".strip(),
                    "experience_level": p.experience_level or "intermediate",
                    "institution": p.institution or "Not Specified",
                    "domain": p.domain or "General",
                    "flagged": getattr(p, "flagged", False)
                })
                
        response_payload.append({
            "id": str(team.id),
            "event_id": str(team.event_id),
            "name": team.name,
            "status": team.approval_status or "pending",
            "stale": getattr(team, "stale", False),
            "llm_rationale": team.llm_rationale,
            "challenge": team.challenge,
            "members": members_list
        })
        
    return response_payload


@router.get("/{event_id}/teams/{team_id}", response_model=TeamRead)
async def get_team(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id, Team.event_id == event_id)
        .options(selectinload(Team.members).selectinload(TeamMember.participant))
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("/{event_id}/teams/{team_id}/approve", response_model=MessageResponse)
async def approve_team(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.event_id == event_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    team.approval_status = "approved"
    await db.commit()
    return {"message": f"{team.name} approved successfully."}


@router.post("/{event_id}/teams/{team_id}/reject", response_model=MessageResponse)
async def reject_team(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.event_id == event_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.approval_status == "approved":
        raise HTTPException(status_code=400, detail="Team is already approved")

    team.approval_status = "rejected"
    await db.commit()
    return {"message": f"{team.name} rejected."}


@router.post("/{event_id}/teams/approve-all", response_model=MessageResponse)
async def approve_all_teams(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(
            Team.event_id == event_id,
            Team.approval_status == "proposed"
        )
    )
    teams = result.scalars().all()

    if not teams:
        raise HTTPException(
            status_code=404,
            detail="No proposed teams found for this event."
        )

    for team in teams:
        team.approval_status = "approved"

    await db.commit()

    return {
        "message": f"All {len(teams)} teams approved successfully.",
        "detail": "You can now call /generate-db-rationales to generate AI rationales."
    }


@router.post("/{event_id}/generate-db-rationales", response_model=MessageResponse)
async def generate_db_rationales(
    event_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db)
):
    team_result = await db.execute(
        select(Team).where(Team.event_id == event_id, Team.llm_rationale == None, Team.approval_status == "approved")
    )
    teams = team_result.scalars().all()
    
    if not teams:
        return {
            "message": "All database team records for this event are already analyzed!",
            "detail": "Processed 0 records."
        }

    dispatched = 0
    for team in teams:
        member_result = await db.execute(
            select(Participant)
            .join(TeamMember, Participant.id == TeamMember.participant_id)
            .where(TeamMember.team_id == team.id)
        )
        db_members = member_result.scalars().all()

        formatted_members = []
        for m in db_members:
            exp_years = 1
            if m.experience_level == 'advanced':
                exp_years = 3
            elif m.experience_level == 'intermediate':
                exp_years = 2

            formatted_members.append({
                "name": f"{m.first_name} {m.last_name}",
                "skills": m.skill_tags if m.skill_tags is not None else [],
                "domain": m.domain or "General",
                "institution": m.institution or "Unknown Institution",
                "experience_years": exp_years
            })

        generate_team_rationale.apply_async(
            kwargs={
                'team_id': str(team.id),
                'team_name': team.name,
                'team_members': formatted_members
            },
            queue='llm_queue'
        )
        dispatched += 1

    return {
        "message": f"Successfully initialized background AI analysis for {dispatched} teams.",
        "detail": "Celery Task IDs queued sequentially onto llm_queue."
    }


@router.get("/{event_id}/stage-status", response_model=MessageResponse)
async def get_stage_status(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    team_result = await db.execute(
        select(Team).where(Team.event_id == event_id, Team.llm_rationale == None)
    )
    missing_rationale = team_result.scalars().first()

    gate_result = await db.execute(
        select(ApprovalGate)
        .where(ApprovalGate.event_id == event_id, ApprovalGate.gate_type == "team_formation")
        .order_by(desc(ApprovalGate.created_at))
    )
    gate = gate_result.scalars().first()

    if not gate:
        return {"message": "pending", "detail": "No team formation has been initiated yet."}

    if not missing_rationale and gate.status == "pending":
        stage_result = await db.execute(
            select(Stage).where(
                Stage.event_id == event_id,
                Stage.sequence_order == 2,
                Stage.is_committee_visible == True
            )
        )
        stage = stage_result.scalar_one_or_none()

        if stage and stage.status != "awaiting_approval" and stage.status != "completed":
            stage.status = "awaiting_approval"
            await db.commit()

        return {
            "message": "awaiting_approval",
            "detail": "All AI rationales compiled. Awaiting approval."
        }

    return {
        "message": gate.status,
        "detail": "All AI rationales compiled. Awaiting approval." if not missing_rationale else "AI tasks are processing."
    }


@router.post("/{event_id}/approve-stage", response_model=MessageResponse)
async def approve_entire_stage(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    gate_result = await db.execute(
        select(ApprovalGate)
        .where(ApprovalGate.event_id == event_id, ApprovalGate.gate_type == "team_formation")
        .order_by(desc(ApprovalGate.created_at))
    )
    gate = gate_result.scalars().first()

    if not gate:
        raise HTTPException(status_code=404, detail="No active stage gate found.")

    allowed_statuses = ["active", "awaiting_approval", "complete"]
    if gate.status not in allowed_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot finalize stage. Status is: {gate.status}. Must be one of {allowed_statuses}"
        )

    check_pending_rationales = await db.execute(
        select(Team).where(
            Team.event_id == event_id,
            Team.approval_status != "rejected",
            Team.llm_rationale == None
        )
    )
    if check_pending_rationales.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot finalize stage. Background Celery jobs are still calculating AI Team Rationales. Please try again shortly."
        )

    team_result = await db.execute(
        select(Team)
        .where(Team.event_id == event_id)
        .options(selectinload(Team.members).selectinload(TeamMember.participant))
    )
    teams = team_result.scalars().all()

    for team in teams:
        if team.approval_status == "rejected":
            continue
            
        team.approval_status = "approved"
        
        snapshot_members = []
        for tm in team.members:
            if tm.participant:
                p = tm.participant
                snapshot_members.append({
                    "id": str(p.id),
                    "name": f"{p.first_name} {p.last_name or ''}".strip(),
                    "email": p.email,
                    "domain": p.domain or "General"
                })

        existing_final_check = await db.execute(
            select(FinalizedTeam).where(FinalizedTeam.team_id == team.id)
        )
        if not existing_final_check.scalar_one_or_none():
            final_team_record = FinalizedTeam(
                event_id=event_id,
                team_id=team.id,
                name=team.name,
                challenge=team.challenge,
                llm_rationale=team.llm_rationale,
                members_snapshot=snapshot_members
            )
            db.add(final_team_record)

    gate.status = "complete"

    current_stage_result = await db.execute(
        select(Stage).where(
            Stage.event_id == event_id,
            Stage.sequence_order == 2
        )
    )
    current_stage = current_stage_result.scalar_one_or_none()
    
    if current_stage:
        complete_stage(current_stage)
        
    await db.commit()

    return {
        "message": "Stage finalized! Verified teams have been securely pushed to production database slots.",
        "detail": "State machine transition: complete."
    }


@router.post("/{event_id}/ai-engine/teams/{team_id}/rationale")
async def create_team_rationale(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    request: TeamRationaleRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.event_id == event_id)
    )
    team = result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(
            status_code=404, 
            detail="Target staging team record context not found inside this event container."
        )

    members_data = []
    for member in request.members:
        if hasattr(member, "model_dump"):
            members_data.append(member.model_dump())
        else:
            members_data.append(member.dict())
    
    try:
        task = generate_team_rationale.apply_async(
            kwargs={
                'team_id': str(team_id),
                'team_name': request.team_name,
                'team_members': members_data
            },
            queue='llm_queue'
        )
        
        celery_result = task.get(timeout=30) 
        generated_text = celery_result.get("rationale", "")
        
        team.llm_rationale = generated_text
        await db.commit()
        
        return {
            "rationale": generated_text,
            "status": "success",
            "team_id": str(team_id)
        }
        
    except TimeoutError:
        raise HTTPException(
            status_code=504, 
            detail="AI evaluation timed out. Downstream text-generation worker queues are saturated."
        )
    except Exception as e:
        await db.rollback()
        print(f"❌ RE-GENERATION SCHEDULING FAILURE: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Background optimization tracking worker failed: {str(e)}"
        )

# =====================================================================
# 🎯 ROUTE: ALLOW TEAMS TO SELECT THEIR OWN TRACK (BULLETPROOF)
# =====================================================================
@router.put("/{event_id}/teams/{team_id}/track", response_model=MessageResponse)
async def update_team_track(
    event_id: uuid.UUID,
    team_id: uuid.UUID,
    request: TrackSelectionRequest,
    db: AsyncSession = Depends(get_db)
):
    found_any = False

    # 1. Try to update the team in the staging Team table
    team_result = await db.execute(select(Team).where(Team.id == team_id, Team.event_id == event_id))
    team = team_result.scalar_one_or_none()
    
    if team:
        team.challenge = request.challenge
        found_any = True

    # 2. Try to update the team in the FinalizedTeam production table
    ft_result = await db.execute(select(FinalizedTeam).where(FinalizedTeam.team_id == team_id))
    ft = ft_result.scalar_one_or_none()
    
    if ft:
        ft.challenge = request.challenge
        found_any = True

    # 3. If the team exists in neither table, THEN throw the 404
    if not found_any:
        raise HTTPException(
            status_code=404, 
            detail=f"Team {team_id} could not be found in either staging or finalized tables."
        )

    await db.commit()
    
    return {"message": f"Team track successfully updated to {request.challenge}"}