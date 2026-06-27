import logging
import uuid

import redis.asyncio as redis
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger("rate_limiter")


async def _increment_with_ttl(client: redis.Redis, key: str, window_seconds: int) -> int:
    count = await client.incr(key)
    if count == 1:
        await client.expire(key, window_seconds)
    return count


async def check_rate_limit(participant_id: uuid.UUID, event_id: uuid.UUID) -> None:
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        participant_count = await _increment_with_ttl(
            client,
            f"ratelimit:participant:{participant_id}",
            3600,
        )
        if participant_count > 30:
            raise HTTPException(
                status_code=429,
                detail="You have reached the limit of 30 questions per hour.",
            )

        event_count = await _increment_with_ttl(
            client,
            f"ratelimit:event:{event_id}",
            60,
        )
        if event_count > 300:
            raise HTTPException(
                status_code=429,
                detail="This event's chatbot is busy. Please try again in a minute.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Redis rate limiter unavailable; failing open: %s", exc)
    finally:
        await client.aclose()
