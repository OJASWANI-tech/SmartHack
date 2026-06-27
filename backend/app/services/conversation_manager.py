import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_conversation import AiConversation

logger = logging.getLogger("conversation_manager")


async def get_or_create_session(
    db: AsyncSession,
    participant_id,
    event_id,
    session_token: str | None,
) -> AiConversation:
    if session_token:
        conversation = (
            await db.execute(
                select(AiConversation).where(
                    AiConversation.session_token == session_token,
                    AiConversation.participant_id == participant_id,
                    AiConversation.event_id == event_id,
                )
            )
        ).scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=403, detail="Invalid session token.")
        return conversation

    conversation = AiConversation(
        participant_id=participant_id,
        event_id=event_id,
        session_token=str(uuid.uuid4()),
        messages=[],
        message_count=0,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


def get_history_for_prompt(
    conversation: AiConversation,
    max_exchanges: int = 10,
) -> list[dict]:
    messages = conversation.messages or []
    recent_messages = messages[-(max_exchanges * 2):]
    return [
        {"role": message.get("role"), "content": message.get("content", "")}
        for message in recent_messages
        if message.get("role") in {"user", "assistant"}
    ]


async def append_message(
    db: AsyncSession,
    conversation: AiConversation,
    role: str,
    content: str,
) -> None:
    try:
        now = datetime.now(timezone.utc)
        messages = list(conversation.messages or [])
        messages.append(
            {
                "role": role,
                "content": content,
                "timestamp": now.isoformat(),
            }
        )
        conversation.messages = messages[-40:]
        conversation.message_count = (conversation.message_count or 0) + 1
        conversation.last_active = now
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.warning("Failed to append conversation message: %s", exc)
