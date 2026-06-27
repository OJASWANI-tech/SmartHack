from app.models.finalized_team import FinalizedTeam
from sqlalchemy import select
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException
from app.db.session import get_db

router = APIRouter()

@router.get("/{event_id}/finalized-teams")
async def list_finalized_teams(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Fetches immutable frozen team structural histories directly from the isolated production table.
    """
    result = await db.execute(
        select(FinalizedTeam)
        .where(FinalizedTeam.event_id == event_id)
        .order_by(FinalizedTeam.created_at)
    )
    records = result.scalars().all()
    
    response_payload = []
    for r in records:
        response_payload.append({
            "id": str(r.team_id),            # Map back to original tracking identifier 
            "finalized_id": str(r.id),       # Table record primary key
            "event_id": str(r.event_id),
            "name": r.name,
            "challenge": r.challenge,
            "status": "approved",             # Hardcoded since these are strictly finalized records
            "stale": False,
            "llm_rationale": r.llm_rationale,
            "members": r.members_snapshot,     # Directly dumps the JSON array list
            "members_snapshot": r.members_snapshot,
            "scores_snapshot": r.scores_snapshot or [],
            "final_calculated_total": float(r.final_calculated_total or 0.0),
            "panel_average_innovation": float(r.panel_average_innovation or 0.0),
            "panel_average_code": float(r.panel_average_code or 0.0),
            "panel_average_presentation": float(r.panel_average_presentation or 0.0),
            "panel_average_impact": float(r.panel_average_impact or 0.0),
            "has_active_anomaly": bool(r.has_active_anomaly),
            "anomaly_details": r.anomaly_details,
            "is_corrected": bool(r.is_corrected),
            "correction_note": r.correction_note,
        })
        
    return response_payload
