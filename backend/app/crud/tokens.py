import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.issued_token import IssuedToken

async def save_token(
    db: AsyncSession, *, jti: str, email: str, role: str,
    expires_at: datetime.datetime, submission_id=None, team_id=None
) -> IssuedToken:
    record = IssuedToken(
        jti=jti, recipient_email=email, role=role,
        expires_at=expires_at, submission_id=submission_id, team_id=team_id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record

async def get_token_by_jti(db: AsyncSession, jti: str):
    result = await db.execute(select(IssuedToken).where(IssuedToken.jti == jti))
    return result.scalar_one_or_none()

async def revoke_token(db: AsyncSession, jti: str) -> bool:
    record = await get_token_by_jti(db, jti)
    if not record:
        return False
    record.revoked = True
    record.revoked_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    return True

async def list_tokens(db: AsyncSession, role: str = None):
    q = select(IssuedToken).order_by(IssuedToken.created_at.desc())
    if role:
        q = q.where(IssuedToken.role == role)
    result = await db.execute(q)
    return result.scalars().all()
