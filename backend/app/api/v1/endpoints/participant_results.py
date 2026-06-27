import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.finalized_team import FinalizedTeam
from app.models.participant import Participant
from app.models.team import Team
from app.models.team_member import TeamMember

router = APIRouter()


def _member_name(member):
    if isinstance(member, dict):
        return member.get("name") or " ".join(
            part for part in [member.get("first_name"), member.get("last_name")] if part
        ).strip()
    return None


def _serialize_members(members_snapshot):
    members = []
    for member in members_snapshot or []:
        name = _member_name(member)
        if name:
            members.append(name)
    return members


def _score_breakdown(team: FinalizedTeam):
    return [
        {"label": "Innovation", "score": float(team.panel_average_innovation or 0.0)},
        {"label": "Code Quality", "score": float(team.panel_average_code or 0.0)},
        {"label": "Presentation", "score": float(team.panel_average_presentation or 0.0)},
        {"label": "Impact", "score": float(team.panel_average_impact or 0.0)},
    ]


def _build_message(team: FinalizedTeam, rank: int | None, top_five: list[FinalizedTeam]):
    score = float(team.final_calculated_total or 0.0)
    if not top_five or score <= 0:
        return "Results are not published yet. Your score and final standing will appear here once the committee publishes the leaderboard."

    if rank and rank <= 5:
        return f"Congratulations! Your team finished in rank #{rank} and is listed among the top 5 teams."

    cutoff = float(top_five[-1].final_calculated_total or 0.0)
    gap = max(0.0, cutoff - score)
    breakdown = _score_breakdown(team)
    lowest = min(breakdown, key=lambda item: item["score"]) if breakdown else None
    focus = f" The panel score was comparatively lower in {lowest['label'].lower()}." if lowest else ""
    return (
        f"Your team was not selected in the top 5 because its final score was {gap:.1f} points below "
        f"the current top-5 cutoff of {cutoff:.1f}.{focus}"
    )


@router.get("/participant_results")
async def get_participant_results(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    participant = (
        await db.execute(select(Participant).where(Participant.id == participant_id))
    ).scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    team = (
        await db.execute(
            select(Team)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .where(Team.event_id == event_id, TeamMember.participant_id == participant_id)
        )
    ).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found for participant")

    teams = (
        await db.execute(
            select(FinalizedTeam)
            .where(FinalizedTeam.event_id == event_id)
            .order_by(FinalizedTeam.final_calculated_total.desc().nullslast(), FinalizedTeam.name)
        )
    ).scalars().all()

    own_result = next((record for record in teams if record.team_id == team.id), None)
    if not own_result:
        raise HTTPException(status_code=404, detail="Final result is not available for this team yet")

    ranked_teams = list(teams)
    top_five = ranked_teams[:5]
    own_rank = next((index + 1 for index, record in enumerate(ranked_teams) if record.team_id == team.id), None)
    result_published = any(float(record.final_calculated_total or 0.0) > 0 for record in ranked_teams)
    score = float(own_result.final_calculated_total or 0.0)

    leaderboard = [
        {
            "rank": index + 1,
            "team_id": str(record.team_id),
            "team_name": record.name,
            "members": _serialize_members(record.members_snapshot),
            "score": float(record.final_calculated_total or 0.0),
        }
        for index, record in enumerate(top_five)
    ] if result_published else []

    return {
        "result_published": result_published,
        "selected": bool(result_published and own_rank and own_rank <= 5),
        "rank": own_rank,
        "team": {
            "id": str(own_result.team_id),
            "name": own_result.name,
            "challenge": own_result.challenge,
            "members": _serialize_members(own_result.members_snapshot),
        },
        "score": score,
        "max_score": 100,
        "score_breakdown": _score_breakdown(own_result),
        "message": _build_message(own_result, own_rank, top_five) if result_published else _build_message(own_result, None, []),
        "leaderboard": leaderboard,
    }
