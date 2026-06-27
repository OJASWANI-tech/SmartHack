import jwt
from fastapi import HTTPException, Query, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.jwt_handler import decode_token
from app.crud.tokens import get_token_by_jti
from app.db.session import get_db
from app.crud.committee import get_member_by_email

security = HTTPBearer(auto_error=False)

async def _verify(token: str, db: AsyncSession) -> dict:
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="link_expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid_token")

    jti = payload.get("jti")
    if jti:
        record = await get_token_by_jti(db, jti)
        if record and record.revoked:
            raise HTTPException(status_code=401, detail="link_revoked")

    return payload

async def get_user_from_link(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
) -> dict:
    return await _verify(token, db)

async def get_user_from_header(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="authentication_required")
    return await _verify(credentials.credentials, db)

def require_role(role: str):
    async def checker(user: dict = Depends(get_user_from_header)):
        user_role = user.get("role")
        print(f"DEBUG require_role: required={role}, got={user_role}")  # ← add this
        
        allowed = [role]
        if role == "committee":
            allowed.extend(["dynamic-committee", "admin", "dynamic-admin"])
        elif role == "admin":
            allowed.append("dynamic-admin")
        
        if user_role not in allowed:
            raise HTTPException(status_code=403, detail=f"requires_{role}_role")
        return user
    return checker

async def get_current_committee_member(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="authentication_required")

    payload = await _verify(credentials.credentials, db)

    # ✅ accept both committee and admin roles
    if payload.get("role") not in ["committee", "dynamic-committee", "admin", "dynamic-admin"]:
        raise HTTPException(status_code=403, detail="requires_committee_role")

    member = await get_member_by_email(db, payload["email"])
    if not member or member.is_active is False:
        raise HTTPException(status_code=401, detail="member_not_found_or_inactive")
    return member

async def require_admin(member=Depends(get_current_committee_member)):
    if member.role != "admin":
        raise HTTPException(status_code=403, detail="admin_required")
    return member
