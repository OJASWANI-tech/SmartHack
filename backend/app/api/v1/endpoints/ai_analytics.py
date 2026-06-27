import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.ai_query_log import AiQueryLog
from app.models.participant import Participant

router = APIRouter()


@router.get("/events/{event_id}/ai-analytics/queries")
async def list_ai_queries(
    event_id: uuid.UUID,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    participant_id: Optional[uuid.UUID] = None,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    filters = [AiQueryLog.event_id == event_id]
    if participant_id:
        filters.append(AiQueryLog.participant_id == participant_id)

    total = (
        await db.execute(select(func.count()).select_from(AiQueryLog).where(*filters))
    ).scalar_one()

    rows = (
        await db.execute(
            select(AiQueryLog, Participant)
            .join(Participant, Participant.id == AiQueryLog.participant_id)
            .where(*filters)
            .order_by(AiQueryLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()

    return {
        "total": total,
        "queries": [
            {
                "id": str(log.id),
                "question": log.question,
                "response": log.response,
                "participant_name": f"{participant.first_name} {participant.last_name}",
                "latency_ms": log.latency_ms,
                "retrieval_used": log.retrieval_used,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log, participant in rows
        ],
    }


@router.get("/events/{event_id}/ai-analytics/summary")
async def get_ai_analytics_summary(
    event_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    total_questions = (
        await db.execute(
            select(func.count()).select_from(AiQueryLog).where(AiQueryLog.event_id == event_id)
        )
    ).scalar_one()

    avg_latency_ms = (
        await db.execute(
            select(func.avg(AiQueryLog.latency_ms)).where(AiQueryLog.event_id == event_id)
        )
    ).scalar_one()

    rag_used_count = (
        await db.execute(
            select(func.sum(case((AiQueryLog.retrieval_used == True, 1), else_=0))).where(
                AiQueryLog.event_id == event_id
            )
        )
    ).scalar_one() or 0

    per_participant_rows = (
        await db.execute(
            select(AiQueryLog.participant_id, func.count().label("question_count"))
            .where(AiQueryLog.event_id == event_id)
            .group_by(AiQueryLog.participant_id)
            .order_by(func.count().desc())
            .limit(10)
        )
    ).all()

    recent_questions = (
        await db.execute(
            select(AiQueryLog.question)
            .where(AiQueryLog.event_id == event_id)
            .order_by(AiQueryLog.created_at.desc())
            .limit(10)
        )
    ).scalars().all()

    return {
        "total_questions": total_questions,
        "avg_latency_ms": float(avg_latency_ms) if avg_latency_ms is not None else 0,
        "rag_usage_rate": (float(rag_used_count) / total_questions * 100) if total_questions else 0,
        "questions_per_participant": {
            str(participant_id): count for participant_id, count in per_participant_rows
        },
        "recent_questions": recent_questions,
    }
