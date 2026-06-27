from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.team import Team
from app.models.score import Score
import uuid

router = APIRouter()


@router.get("/{event_id}/leaderboard")
async def get_leaderboard(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Team)
        .where(
            Team.event_id == event_id,
            Team.final_score != None,
        )
        .order_by(Team.final_score.desc())
    )
    teams = result.scalars().all()

    if not teams:
        raise HTTPException(status_code=404, detail="No scored teams found yet")

    leaderboard = []
    for rank, team in enumerate(teams, start=1):
        scores_result = await db.execute(
            select(Score).where(Score.team_id == team.id)
        )
        scores = scores_result.scalars().all()

        leaderboard.append({
            "rank": rank,
            "team_id": str(team.id),
            "team_name": team.name,
            "team": team.name,
            "final_score": float(team.final_score),
            "total": float(team.final_score),
            "approval_status": team.approval_status,
            "scores_count": len(scores),
            "has_anomaly": any(s.flagged for s in scores),
            "challenge": team.challenge,
        })

    return leaderboard