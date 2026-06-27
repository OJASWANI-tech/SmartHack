import jwt
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.password import verify_password
from app.core.jwt_handler import create_committee_tokens, decode_token
from app.crud.committee import get_member_by_email
from app.schemas.auth import LoginRequest, RefreshRequest
from app.crud.tokens import save_token
import datetime
from app.models.committee_member import CommitteeMember
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

from app.schemas.auth import SignupRequest  # add this schema
from app.crud.committee import get_member_by_email, create_member
from app.core.password import hash_password

@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, data: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_member_by_email(db, data.email)
    if existing:
        raise HTTPException(400, "An account with this email already exists")

    hashed = hash_password(data.password)
    member = await create_member(
        db, name=data.name, email=data.email,
        hashed_password=hashed, role="admin"
    )

    access_token, refresh_token = create_committee_tokens(member.id, member.email, role="committee")

    # ✅ Decode JTIs and save both tokens
    access_payload = decode_token(access_token)
    refresh_payload = decode_token(refresh_token)

    await save_token(
        db,
        jti=access_payload["jti"],
        email=member.email,
        role="committee",
        expires_at=datetime.datetime.fromtimestamp(access_payload["exp"], tz=datetime.timezone.utc),
    )
    await save_token(
        db,
        jti=refresh_payload["jti"],
        email=member.email,
        role="committee",
        expires_at=datetime.datetime.fromtimestamp(refresh_payload["exp"], tz=datetime.timezone.utc),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {"id": member.id, "name": member.name, "email": member.email, "role": member.role}
    }

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    member = await get_member_by_email(db, data.email)
    if not member or not verify_password(data.password, member.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not member.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    if not member.is_verified: 
        raise HTTPException(status_code=403, detail="Account setup incomplete. Check your email for the setup link.") 

    access_token, refresh_token = create_committee_tokens(member.id, member.email, role="committee", event_id=str(member.event_id) if member.event_id else None)
    
    # ✅ ADD THIS

    access_payload = decode_token(access_token)
    refresh_payload = decode_token(refresh_token)

    await save_token(db, jti=access_payload["jti"], email=member.email, role=member.role,
        expires_at=datetime.datetime.fromtimestamp(access_payload["exp"], tz=datetime.timezone.utc))
    await save_token(db, jti=refresh_payload["jti"], email=member.email, role=member.role,
        expires_at=datetime.datetime.fromtimestamp(refresh_payload["exp"], tz=datetime.timezone.utc))


    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {"id": member.id, "name": member.name, "email": member.email, "role": member.role},
    }

# ✅ Fix /refresh to carry forward workspace role
@router.post("/refresh")
async def refresh(data: RefreshRequest):
    try:
        payload = decode_token(data.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(401, "Not a refresh token")

    role = payload.get("role", "committee")  # ✅ carry forward, was hardcoded

    access_token, refresh_token = create_committee_tokens(
        int(payload["sub"]), payload.get("email", ""), role=role
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# ✅ NEW endpoint
@router.post("/select-workspace")
async def select_workspace(
    workspace: str,
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    member = await db.get(CommitteeMember, user_id)
    if not member:
        raise HTTPException(404, "Member not found")
    if workspace not in ["committee", "dynamic-committee"]:
        raise HTTPException(400, "Invalid workspace")

    access_token, refresh_token = create_committee_tokens(
        member.id, member.email, role=workspace,
        event_id=str(member.event_id) if member.event_id else None
    )

    access_payload = decode_token(access_token)
    refresh_payload = decode_token(refresh_token)
    await save_token(db, jti=access_payload["jti"], email=member.email, role=workspace,
        expires_at=datetime.datetime.fromtimestamp(access_payload["exp"], tz=datetime.timezone.utc))
    await save_token(db, jti=refresh_payload["jti"], email=member.email, role=workspace,
        expires_at=datetime.datetime.fromtimestamp(refresh_payload["exp"], tz=datetime.timezone.utc))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "workspace": workspace
    }