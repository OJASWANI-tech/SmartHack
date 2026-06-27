import json
import base64
from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import RedirectResponse
from app.services.google_auth import get_google_auth_url, exchange_code_for_token, get_google_user_info
from app.core.config import settings
from app.db.session import get_db  # your db dependency
from app.core.jwt_handler import create_committee_tokens
from sqlalchemy import text
from app.crud.tokens import save_token
from app.core.jwt_handler import decode_token
import datetime
from app.crud.committee import _hash_token  # import the hash function

router = APIRouter(prefix="/auth", tags=["Google Auth"], redirect_slashes=False)


# ── Step 1: Redirect to Google ──────────────────────────────────────────────

@router.get("/google")
async def google_login(
    flow: str = Query(...),           # admin-signup | admin-login | member-signup | member-login
    token: str = Query(None)          # invite_token, only for member-signup
):
    state = base64.b64encode(
        json.dumps({"flow": flow, "token": token}).encode()
    ).decode()

    url = get_google_auth_url(
        state=state,
        callback_url=settings.GOOGLE_CALLBACK_URL,
        client_id=settings.GOOGLE_CLIENT_ID
    )
    return RedirectResponse(url, status_code=302)  # ← use 302 not default 307


# ── Step 2: Google Callback ──────────────────────────────────────────────────

@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db=Depends(get_db)
):
    # Decode state
    decoded = json.loads(base64.b64decode(state).decode())
    flow = decoded.get("flow")
    invite_token = decoded.get("token")

    # Exchange code for token
    token_data = await exchange_code_for_token(
        code=code,
        callback_url=settings.GOOGLE_CALLBACK_URL,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET
    )

    # ← ADD THESE CHECKS
    if "error" in token_data:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=token_exchange_failed",
            status_code=302
        )

    access_token_google = token_data.get("access_token")
    if not access_token_google:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=no_access_token",
            status_code=302
        )


    # Get user info from Google
    user_info = await get_google_user_info(access_token_google)

    # ← ADD THIS CHECK
    if "sub" not in user_info:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=google_user_info_failed",
            status_code=302
        )
    
    google_id = user_info["sub"]
    email = user_info["email"]
    name = user_info.get("name")
    avatar_url = user_info.get("picture")

    # Branch on flow
    if flow == "admin-signup":
        user = await handle_admin_google_signup(db, google_id, email, name, avatar_url)

    elif flow == "admin-login":
        user = await handle_admin_google_login(db, google_id, email, name, avatar_url)

    elif flow == "member-signup":
        try:
            user = await handle_member_google_signup(db, google_id, email, name, avatar_url, invite_token)
        except HTTPException as e:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/committee/setup?error={e.detail}",
                status_code=302
            )

    elif flow == "member-login":
        try:
            user = await handle_member_google_login(db, google_id, email)
        except HTTPException as e:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/login?error={e.detail}",
                status_code=302
            )

    else:
        raise HTTPException(status_code=400, detail="Invalid flow")

    
    print("User role from DB:", user["role"])
    print("User data:", dict(user))
    
    # rename to avoid clash with google access_token variable
    jwt_access_token, jwt_refresh_token = create_committee_tokens(
        member_id=user["id"],
        email=user["email"],
        role="committee",
        event_id=user.get("event_id")
    )

    # ✅ ADD THIS — covers all 4 flows (admin-signup, admin-login, member-signup, member-login)
 
    access_payload = decode_token(jwt_access_token)
    refresh_payload = decode_token(jwt_refresh_token)
    await save_token(db, jti=access_payload["jti"], email=user["email"], role="committee",
        expires_at=datetime.datetime.fromtimestamp(access_payload["exp"], tz=datetime.timezone.utc))
    await save_token(db, jti=refresh_payload["jti"], email=user["email"], role="committee",
        expires_at=datetime.datetime.fromtimestamp(refresh_payload["exp"], tz=datetime.timezone.utc))

    if flow == "member-signup":
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/committee/setup?google_token={jwt_access_token}&google_refresh={jwt_refresh_token}&db_role={user['role']}",
            status_code=302
        )
    else:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?google_token={jwt_access_token}&google_refresh={jwt_refresh_token}&db_role={user['role']}",
            status_code=302
        )


# All handler functions
async def handle_admin_google_signup(db, google_id, email, name, avatar_url):
    result = await db.execute(text("SELECT * FROM committee_members WHERE email=:email"), {"email": email})
    user = result.mappings().first()
    if user:
        await db.execute(text("""
            UPDATE committee_members 
            SET google_id=:google_id, avatar_url=:avatar_url,
                auth_provider=CASE 
                    WHEN auth_provider='local' THEN 'both' 
                    ELSE auth_provider END
            WHERE email=:email
        """), {"google_id": google_id, "avatar_url": avatar_url, "email": email})
    else:
        await db.execute(text("""
            INSERT INTO committee_members 
                (name, email, google_id, avatar_url, auth_provider, role, is_verified)
            VALUES (:name, :email, :google_id, :avatar_url, 'google', 'admin', true)
        """), {"name": name, "email": email, "google_id": google_id, "avatar_url": avatar_url})
    await db.commit()
    result = await db.execute(text("SELECT * FROM committee_members WHERE email=:email"), {"email": email})
    return result.mappings().first()


async def handle_admin_google_login(db, google_id, email, name, avatar_url):
    result = await db.execute(text("SELECT * FROM committee_members WHERE google_id=:google_id"), {"google_id": google_id})
    user = result.mappings().first()
    if not user:
        result = await db.execute(text("SELECT * FROM committee_members WHERE email=:email"), {"email": email})
        user = result.mappings().first()
        if user:
            await db.execute(text("""
                UPDATE committee_members 
                SET google_id=:google_id, auth_provider='both'
                WHERE email=:email
            """), {"google_id": google_id, "email": email})
            await db.commit()
        else:
            return await handle_admin_google_signup(db, google_id, email, name, avatar_url)
    result = await db.execute(text("SELECT * FROM committee_members WHERE email=:email"), {"email": email})
    return result.mappings().first()


async def handle_member_google_signup(db, google_id, email, name, avatar_url, invite_token):
    if not invite_token:
        raise HTTPException(status_code=400, detail="Invite token missing")
    hashed_token = _hash_token(invite_token)  # ✅ hash before querying
    result = await db.execute(text("""
        SELECT * FROM committee_members 
        WHERE invite_token=:token AND invite_expires_at > NOW()
    """), {"token": hashed_token})
    user = result.mappings().first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")
    if user["email"] != email:
        raise HTTPException(status_code=400, detail="Google account email doesn't match invite email")
    await db.execute(text("""
        UPDATE committee_members
        SET google_id=:google_id, avatar_url=:avatar_url, auth_provider='google',
            is_verified=true, invite_token=null, invite_expires_at=null,
            name=COALESCE(name, :name)
        WHERE id=:id
    """), {"google_id": google_id, "avatar_url": avatar_url, "name": name, "id": user["id"]})
    await db.commit()
    result = await db.execute(text("SELECT * FROM committee_members WHERE id=:id"), {"id": user["id"]})
    return result.mappings().first()


async def handle_member_google_login(db, google_id, email):
    result = await db.execute(text("SELECT * FROM committee_members WHERE google_id=:google_id"), {"google_id": google_id})
    user = result.mappings().first()
    if not user:
        result = await db.execute(text("SELECT * FROM committee_members WHERE email=:email"), {"email": email})
        user = result.mappings().first()
        if user:
            await db.execute(text("""
                UPDATE committee_members 
                SET google_id=:google_id, auth_provider='both'
                WHERE email=:email
            """), {"google_id": google_id, "email": email})
            await db.commit()
        else:
            raise HTTPException(status_code=400, detail="No account found. You need an invite to join.")
    result = await db.execute(text("SELECT * FROM committee_members WHERE email=:email"), {"email": email})
    return result.mappings().first()