import logging
import uuid
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.finalized_team import FinalizedTeam

logger = logging.getLogger("services.team_scores")

async def recalculate_and_verify_team_scores(team: FinalizedTeam, scores: List[Dict[str, Any]]):
    """
    Takes a clean array of score sheets, computes all localized matrix averages, 
    totals them out, and updates the FinalizedTeam metrics snapshot.
    """
    if not scores:
        return team

    total_panel_score = 0.0
    innov_sum, code_sum, pres_sum, imp_sum = 0, 0, 0, 0
    num_judges = len(scores)

    processed_scores = []
    for sheet in scores:
        j_innov = sheet.get("innovation", 0)
        j_code = sheet.get("code_quality", 0)
        j_pres = sheet.get("presentation", 0)
        j_imp = sheet.get("impact", 0)
        
        judge_total = j_innov + j_code + j_pres + j_imp
        total_panel_score += judge_total
        
        innov_sum += j_innov
        code_sum += j_code
        pres_sum += j_pres
        imp_sum += j_imp
        
        processed_scores.append({
            "judge_name": sheet.get("judge_name"),
            "innovation": j_innov,
            "code_quality": j_code,
            "presentation": j_pres,
            "impact": j_imp,
            "total": judge_total
        })

    # Save mutated snapshots back into the JSON/Float ecosystem
    team.scores_snapshot = processed_scores
    team.final_calculated_total = round(total_panel_score / num_judges, 2)
    team.panel_average_innovation = round(innov_sum / num_judges, 1)
    team.panel_average_code = round(code_sum / num_judges, 1)
    team.panel_average_presentation = round(pres_sum / num_judges, 1)
    team.panel_average_impact = round(imp_sum / num_judges, 1)
    
    return team


async def apply_committee_correction(db: AsyncSession, team_id: uuid.UUID, method: str, note: str):
    """
    Queries your FinalizedTeam records, applies corrections directly inside the matrix,
    updates tracking flags, and commits the mutation to PostgreSQL.
    """
    # Look up by either the ID or the team_id (PK or tracking source UUID)
    if isinstance(team_id, str):
        try:
            team_uuid = uuid.UUID(team_id)
        except ValueError:
            team_uuid = None
    else:
        team_uuid = team_id

    if team_uuid:
        result = await db.execute(
            select(FinalizedTeam).filter(
                (FinalizedTeam.id == team_uuid) | (FinalizedTeam.team_id == team_uuid)
            )
        )
        team = result.scalars().first()
    else:
        team = None
    
    if not team:
        raise ValueError("Finalized team snapshot records not found")

    if method in ["Override with Panel Average", "override_average"]:
        updated_scores = list(team.scores_snapshot) if team.scores_snapshot else []
        
        # Pull parameters dynamically out of the anomaly detail JSON layer
        target_dim = team.anomaly_details.get("dimension") if team.anomaly_details else "presentation"
        target_judge = team.anomaly_details.get("judge") if team.anomaly_details else "Judge B"
        
        for sheet in updated_scores:
            if sheet.get("judge_name") == target_judge:
                if target_dim == "presentation" and team.panel_average_presentation is not None:
                    sheet["presentation"] = int(round(team.panel_average_presentation))
                elif target_dim == "innovation" and team.panel_average_innovation is not None:
                    sheet["innovation"] = int(round(team.panel_average_innovation))
                elif target_dim == "code_quality" and team.panel_average_code is not None:
                    sheet["code_quality"] = int(round(team.panel_average_code))
                elif target_dim == "impact" and team.panel_average_impact is not None:
                    sheet["impact"] = int(round(team.panel_average_impact))
                
                # Recalculate total for the overridden judge sheet
                sheet["total"] = sheet.get("innovation", 0) + sheet.get("code_quality", 0) + sheet.get("presentation", 0) + sheet.get("impact", 0)

        # Re-run mathematical totals across the whole panel matrix
        await recalculate_and_verify_team_scores(team, updated_scores)

    # State Machine updates
    team.has_active_anomaly = False
    team.is_corrected = True
    team.correction_note = f"Resolved via: {method}. Note: {note}"
    
    await db.commit()
    await db.refresh(team)
    return team