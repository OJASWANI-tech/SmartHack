import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.conversation_manager import (
    append_message,
    get_history_for_prompt,
    get_or_create_session,
)
from app.services.participant_ai_service import generate_participant_ai_answer
from app.services.rate_limiter import check_rate_limit

router = APIRouter()


class AskAIRequest(BaseModel):
    event_id: uuid.UUID
    participant_id: uuid.UUID
    question: str
    session_token: Optional[str] = None


@router.post("/ask-ai")
async def ask_ai(
    payload: AskAIRequest,
    db: AsyncSession = Depends(get_db),
):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if len(question) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Question too long. Max 1000 characters.",
        )

    await check_rate_limit(payload.participant_id, payload.event_id)
    conversation = await get_or_create_session(
        db=db,
        participant_id=payload.participant_id,
        event_id=payload.event_id,
        session_token=payload.session_token,
    )
    conversation_history = get_history_for_prompt(conversation)

    answer = await generate_participant_ai_answer(
        question=question,
        participant_id=payload.participant_id,
        event_id=payload.event_id,
        db=db,
        conversation_history=conversation_history,
        #session_token=conversation.session_token,
    )

    await append_message(db, conversation, "user", question)
    await append_message(db, conversation, "assistant", answer)

    return {
        "question": question,
        "answer": answer,
        "session_token": conversation.session_token,
        "event_id": str(payload.event_id),
        "participant_id": str(payload.participant_id),
    }
