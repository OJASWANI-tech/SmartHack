from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
import datetime
from typing import Optional  # 📬 Safe fallback typing wrapper
from uuid import UUID
from app.crud.tokens import save_token
from app.core.jwt_handler import decode_token
import datetime

from app.db.session import get_db

from app.crud.committee import (
    get_member_by_email,
    create_invited_member,
    get_member_by_invite_token,
    complete_member_setup,
    regenerate_invite_token,
)
from app.core.password import hash_password
from app.core.jwt_handler import create_committee_tokens
from app.core.dependencies import require_admin
from app.services.email_service import send_magic_link
from app.core.config import settings

router = APIRouter(prefix="/committee", tags=["committee-invite"])


class InviteRequest(BaseModel):
    email: EmailStr
    event_id: UUID
    sandbox_delivery_email: Optional[str] = None  # Intercept address for Resend testing


class SetupRequest(BaseModel):
    token: str
    name: str
    password: str

# 🔑 Ensure send_invite_email is imported alongside send_magic_link at the top of router.py
from app.services.email_service import send_magic_link, send_invite_email

@router.post("/invite")
async def invite_member(
    data: InviteRequest,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    # 1. Extract name from email dynamically (e.g., "john.doe@example.com" -> "John Doe")
    username_part = data.email.split("@")[0]
    extracted_name = username_part.replace(".", " ").replace("_", " ").title()

    # 2. Use the REAL email for database row creation and checking records
    existing = await get_member_by_email(db, data.email)
    if existing:
        if existing.is_verified:
            raise HTTPException(400, "This member has already completed their account setup.")
        member, raw_token = await regenerate_invite_token(db, existing)
    else:
        member, raw_token = await create_invited_member(db, data.email, data.event_id)
        
        if hasattr(member, 'name') and not member.name:
            member.name = extracted_name

    # Build setup link
    invite_link = f"{settings.FRONTEND_URL}/committee/setup?token={raw_token}"
    
    # 3. Check if a sandbox intercept address is provided
    destination_email = data.sandbox_delivery_email if data.sandbox_delivery_email else data.email
    
    # 🛑 STRICT SINGLE DELIVERY GUARD FOR DEMO:
    email_was_sent = False
    allowed_emails = ["shreya67324@gmail.com", "shubhika1056@gmail.com", "shubhtech1056@gmail.com", "noname972642@gmail.com", "shreya67324@gmail.com"]
    if destination_email in allowed_emails:
        # 🔑 FIX: Call the correct service function designed for committee templates
        await send_invite_email(
            to=destination_email, 
            invite_link=invite_link, 
            inviter_name=extracted_name  # Injects the dynamic name straight into the template!
        )
        email_was_sent = True

    # 4. Custom response message stating they are a committee member now
    welcome_message = f"Hello {extracted_name}, you are a committee member now! "
    if email_was_sent:
        welcome_message += f"An invitation link has been dispatched to your testing inbox: {destination_email}."
    else:
        welcome_message += "Profile staged in database. Live email skipped to enforce single-delivery limits."

    return {
        "message": welcome_message, 
        "invite_link": invite_link,
        "extracted_name": extracted_name,
        "email_sent": email_was_sent
    }

@router.post("/setup")
async def setup_account(data: SetupRequest, db: AsyncSession = Depends(get_db)):
    member = await get_member_by_invite_token(db, data.token)

    if not member:
        raise HTTPException(400, "Invalid or already used invite link")

    # Check expiry
    now = datetime.datetime.now(datetime.timezone.utc)
    if member.invite_expires_at and member.invite_expires_at.replace(tzinfo=datetime.timezone.utc) < now:
        raise HTTPException(400, "Invite link has expired. Ask an admin to resend.")

    if len(data.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    await complete_member_setup(db, member, data.name, hash_password(data.password))

    # Auto-login after setup
    access_token, refresh_token = create_committee_tokens(member.id, member.email, role="committee")

    # ✅ ADD THIS
    access_payload = decode_token(access_token)
    refresh_payload = decode_token(refresh_token)
    await save_token(db, jti=access_payload["jti"], email=member.email, role="committee",
        expires_at=datetime.datetime.fromtimestamp(access_payload["exp"], tz=datetime.timezone.utc))
    await save_token(db, jti=refresh_payload["jti"], email=member.email, role="committee",
        expires_at=datetime.datetime.fromtimestamp(refresh_payload["exp"], tz=datetime.timezone.utc))
    
    return {
        "message": "Account created successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {"id": member.id, "name": data.name, "email": member.email, "role": member.role},
    }


@router.get("/setup/verify")
async def verify_invite(token: str, db: AsyncSession = Depends(get_db)):
    member = await get_member_by_invite_token(db, token)
    if not member:
        raise HTTPException(400, "Invalid or already used invite link")

    now = datetime.datetime.now(datetime.timezone.utc)
    if member.invite_expires_at and member.invite_expires_at.replace(tzinfo=datetime.timezone.utc) < now:
        raise HTTPException(400, "Invite link has expired. Ask an admin to resend.")

    return {"valid": True, "email": member.email}
