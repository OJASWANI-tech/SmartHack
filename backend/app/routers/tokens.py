import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.dependencies import require_role
from app.core.jwt_handler import create_evaluator_token, create_participant_token
from app.crud.tokens import save_token, revoke_token, list_tokens
from app.services.email_service import send_magic_link
from app.schemas.token import EvaluatorTokenRequest, ParticipantTokenRequest
from app.crud.tokens import get_token_by_jti
import jwt
from app.core.jwt_handler import decode_token
from fastapi import Query
from sqlalchemy import select

from app.models.evaluator import Evaluator

from app.core.config import settings

router = APIRouter(prefix="/tokens", tags=["tokens"])
FRONTEND_URL = settings.FRONTEND_URL

@router.post("/evaluator")
async def issue_evaluator(
    data: EvaluatorTokenRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("committee")),
):
    # 🔍 1. ALWAYS look up the real judge record using the genuine evaluator_email
    result = await db.execute(
        select(Evaluator).where(
            Evaluator.email == data.evaluator_email,
            Evaluator.event_id == data.event_id
        )
    )
    evaluator = result.scalar_one_or_none()
    if not evaluator:
        raise HTTPException(status_code=404, detail="Evaluator not found for this event")

    # 🔑 2. Issue the JWT payload using the real evaluator's identity data
    token, jti, expires = create_evaluator_token(
        data.evaluator_email,
        evaluator.id,
        data.event_id
    )
    await save_token(db, jti=jti, email=data.evaluator_email, role="evaluator",
                     expires_at=expires, submission_id=str(evaluator.id))
    
    link = f"{FRONTEND_URL}/evaluator?token={token}"
    
    # 📬 3. Route the message to your sandbox destination if specified, otherwise default to the real email
    delivery_target = data.sandbox_delivery_email or data.evaluator_email
    await send_magic_link(to=delivery_target, link=link, role="evaluator")
    
    return {
        "message": f"Evaluator link routed to {delivery_target}",
        "jti": jti,
        "link": link,
        "expires_at": expires.isoformat()
    }
@router.post("/participant")
async def issue_participant(
    data: ParticipantTokenRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("committee")),
):
    token, jti, expires = create_participant_token(data.participant_email, data.team_id, data.participant_id, data.event_id)
    await save_token(db, jti=jti, email=data.participant_email, role="participant",
                     expires_at=expires, team_id=str(data.team_id))              # ← str()
    link = f"{FRONTEND_URL}/participant?token={token}"
    await send_magic_link(to=data.participant_email, link=link, role="participant")
    return {"message": "Participant link sent", "jti": jti, "link": link, "expires_at": expires.isoformat()}

@router.post("/revoke/{jti}")
async def revoke(
    jti: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("committee"))
):
    success = await revoke_token(db, jti)
    if not success:
        raise HTTPException(404, "Token not found")
    return {"message": "Token revoked"}

@router.get("/list")
async def get_tokens(
    role: str = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("committee"))
):
    tokens = await list_tokens(db, role)
    return [
        {"jti": t.jti, "email": t.recipient_email, "role": t.role,
         "expires_at": t.expires_at, "revoked": t.revoked}
        for t in tokens
    ]

@router.get("/verify")
async def verify_token(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="link_expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid_token")
    
    jti = payload.get("jti")
    if jti:
        record = await get_token_by_jti(db, jti)
        if not record:
            raise HTTPException(status_code=401, detail="token_not_issued")
        if record.revoked:
            raise HTTPException(status_code=401, detail="link_revoked")
    
    return {"valid": True, "role": payload.get("role")}
