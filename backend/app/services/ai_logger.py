import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_query_log import AiQueryLog

logger = logging.getLogger("ai_logger")


async def log_ai_query(
    db: AsyncSession,
    event_id,
    participant_id,
    question: str,
    response: str,
    latency_ms: int,
    retrieval_used: bool = False,
    session_token: str = None,
) -> None:
    try:
        log_entry = AiQueryLog(
            event_id=event_id,
            participant_id=participant_id,
            question=(question or "")[:2000],
            response=(response or "")[:5000],
            latency_ms=latency_ms,
            retrieval_used=retrieval_used,
            session_token=session_token,
        )
        db.add(log_entry)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.warning("Failed to write AI query log: %s", exc)
