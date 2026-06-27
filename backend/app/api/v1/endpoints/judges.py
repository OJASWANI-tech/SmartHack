# backend/app/api/v1/endpoints/judges.py
import csv
import io
import uuid
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_

# Core application hooks
from app.db.session import get_db
from app.models.finalized_team import FinalizedTeam
from app.models.evaluator import Evaluator
from app.services.activity_log import log_action

router = APIRouter(prefix="/events", tags=["Judges Logistics"])

# ─── 🎯 YOUR EXPLICIT DOMAIN MAPPING TAXONOMY ───
DOMAIN_MAPPING = {
    "ai": "Artificial Intelligence & Machine Learning",
    "developer": "Artificial Intelligence & Machine Learning",
    "data": "Artificial Intelligence & Machine Learning",
    "devs": "Artificial Intelligence & Machine Learning",
    "artificial intelligence & machine learning": "Artificial Intelligence & Machine Learning",
    
    "business": "FinTech & Decentralized Payments",
    "pm": "FinTech & Decentralized Payments",
    "biz": "FinTech & Decentralized Payments",
    "fintech & decentralized payments": "FinTech & Decentralized Payments",
    
    "cyber": "CyberSecurity & Zero-Trust Architecture",
    "security": "CyberSecurity & Zero-Trust Architecture",
    "cybersecurity & zero-trust architecture": "CyberSecurity & Zero-Trust Architecture",
    
    "design": "HealthTech & Digital Patient Care",
    "ux": "HealthTech & Digital Patient Care",
    "ui": "HealthTech & Digital Patient Care",
    "designer": "HealthTech & Digital Patient Care",
    "healthtech & digital patient care": "HealthTech & Digital Patient Care",
    
    "web3": "Web3 & Blockchain Infrastructure",
    "blockchain": "Web3 & Blockchain Infrastructure",
    "web3 & blockchain infrastructure": "Web3 & Blockchain Infrastructure"
}

def normalize_to_domain(text: str) -> str:
    """
    Parses fuzzy raw text strings from either team challenges or judge descriptions
    and matches them against the explicit operational track domains.
    """
    if not text:
        return "General Track"
    
    text_lower = text.lower().strip()
    
    # Direct match check first to optimize exact terms
    if text_lower in DOMAIN_MAPPING:
        return DOMAIN_MAPPING[text_lower]
        
    # Keyword containment check (e.g., 'Build an AI tool' contains 'ai')
    for keyword, standardized_domain in DOMAIN_MAPPING.items():
        if keyword in text_lower:
            return standardized_domain
            
    return "General Track"


@router.post("/{event_id}/upload-judges-expertise", status_code=status.HTTP_200_OK)
async def upload_judges_expertise(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingests judge profile CSV matrices, normalizes track specialties against
    custom mapping logic, and auto-allocates matching empty panels to teams.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Target format constraint violation. Document file must be a valid CSV."
        )

    try:
        contents = await file.read()
        buffer = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(buffer)
        
        # Structure: {"Web3 & Blockchain Infrastructure": ["Judge Alpha", "Judge Beta"]}
        expertise_map = defaultdict(list)
        judge_details = {}
        
        for row in reader:
            # Fallback to accommodate various header formats ('judge_name' or 'name')
            judge_name = (row.get("judge_name") or row.get("name") or "").strip()
            if not judge_name:
                continue
                
            expertise_string = (row.get("expertise") or row.get("domain") or "").strip()
            
            # Split tags if comma-separated, normalize them, and map judges to clean domains
            expert_categories = [cat.strip() for cat in expertise_string.split(',') if cat.strip()]
            normalized_categories = []
            
            for category in expert_categories:
                normalized_cat = normalize_to_domain(category)
                if normalized_cat not in normalized_categories:
                    normalized_categories.append(normalized_cat)
                
                # Append judge name to the clean tracking bucket array
                if judge_name not in expertise_map[normalized_cat]:
                    expertise_map[normalized_cat].append(judge_name)
                
            email = row.get("email", "").strip()
            institution = row.get("institution", "").strip()
            domain = (row.get("primary_domain") or row.get("domain", "")).strip()
            
            max_workload_raw = (row.get("max_workload") or row.get("max_assignments") or "3").strip()
            try:
                max_workload = int(max_workload_raw)
            except ValueError:
                max_workload = 3
                
            skill_tags_raw = row.get("skill_tags", "")
            skill_tags = [t.strip() for t in skill_tags_raw.split(",") if t.strip()]
            
            avail_raw = row.get("availability", "").lower()
            availability = {
                "morning": "morning" in avail_raw,
                "afternoon": "afternoon" in avail_raw,
                "evening": "evening" in avail_raw
            }
            if not any(availability.values()):
                availability = {"morning": True, "afternoon": True, "evening": False}
                
            judge_details[judge_name] = {
                "email": email,
                "institution": institution,
                "domain": domain,
                "max_workload": max_workload,
                "skill_tags": skill_tags,
                "availability": availability,
                "preferred_categories": normalized_categories
            }
                
    except Exception as parse_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail=f"Failed to interpret incoming streaming matrix: {str(parse_err)}"
        )

    # Fetch active finalized team rows
    stmt = select(FinalizedTeam).where(FinalizedTeam.event_id == event_id)
    res = await db.execute(stmt)
    db_teams = res.scalars().all()
    
    if not db_teams:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No active finalized team assets currently loaded inside event ledger indexes."
        )

    all_unique_judges = set()
    for team in db_teams:
        # Convert loose database challenge text into matching mapping tokens
        normalized_team_domain = normalize_to_domain(team.challenge)
        
        # Pull judges grouped under this mapped text label
        matching_judges = expertise_map.get(normalized_team_domain, [])
        
        # Fallback to General Track if specific bucket yields nothing
        if not matching_judges and normalized_team_domain != "General Track":
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
            all_unique_judges.add(judge)
            
        # Commit updated snapshots directly to DB row instance references
        team.scores_snapshot = allocated_panel_snapshot
        
        team.final_calculated_total = 0.0
        team.panel_average_innovation = 0.0
        team.panel_average_code = 0.0
        team.panel_average_presentation = 0.0
        team.panel_average_impact = 0.0
        team.has_active_anomaly = False
        team.anomaly_details = None

    # Handle Evaluator identity records setup tracking lifecycle
    for judge_name in all_unique_judges:
        details = judge_details.get(judge_name, {})
        email_slug = judge_name.lower().replace("prof.", "").replace("dr.", "").strip().replace(" ", "_").replace(".", "")
        token_slug = judge_name.lower().replace(" ", "_").replace(".", "")
        
        email = details.get("email") or f"{email_slug}@example.com"
        access_token_string = f"eval_token_{token_slug}"
        
        institution = details.get("institution") or None
        domain = details.get("domain") or None
        max_workload = details.get("max_workload", 3)
        preferred_categories = details.get("preferred_categories") or []
        skill_tags = details.get("skill_tags") or []
        availability = details.get("availability") or {"morning": True, "afternoon": True, "evening": False}
        
        eval_stmt = select(Evaluator).where(
            or_(
                Evaluator.email == email,
                Evaluator.access_token == access_token_string
            )
        )
        eval_res = await db.execute(eval_stmt)
        existing_evaluator = eval_res.scalar_one_or_none()
        
        if not existing_evaluator:
            new_eval = Evaluator(
                id=uuid.uuid4(),
                event_id=event_id,
                name=judge_name,
                email=email,
                access_token=access_token_string,
                institution=institution,
                domain=domain,
                max_workload=max_workload,
                skill_tags=skill_tags,
                preferred_categories=preferred_categories,
                availability=availability
            )
            db.add(new_eval)
        else:
            existing_evaluator.event_id = event_id
            existing_evaluator.name = judge_name
            existing_evaluator.email = email
            existing_evaluator.access_token = access_token_string
            if institution:
                existing_evaluator.institution = institution
            if domain:
                existing_evaluator.domain = domain
            existing_evaluator.max_workload = max_workload
            if skill_tags:
                existing_evaluator.skill_tags = skill_tags
            existing_evaluator.preferred_categories = preferred_categories
            existing_evaluator.availability = availability

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Evaluation",
        action=f"Judges expertise uploaded and allocated to {len(db_teams)} teams",
        actor="Admin Portal",
        meta={"judges_count": len(all_unique_judges), "teams_count": len(db_teams)}
    )
    
    await db.commit()
    return {
        "status": "success", 
        "detail": "Judges allocated to target assignments based on domain-expertise configurations."
    }