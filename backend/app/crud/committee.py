from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.committee_member import CommitteeMember
import secrets
import hashlib
import datetime
from sqlalchemy import update

async def get_member_by_email(db: AsyncSession, email: str):
    result = await db.execute(
        select(CommitteeMember).where(CommitteeMember.email == email)
    )
    return result.scalar_one_or_none()

async def create_member(db: AsyncSession, name: str, email: str, hashed_password: str, role: str = "member", event_id=None):
    member = CommitteeMember(name=name, email=email, hashed_password=hashed_password, role=role, is_verified=True, event_id=event_id)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member

async def update_member(db: AsyncSession, member: CommitteeMember, 
                        name: str, hashed_password: str, role=None):
    member.name            = name
    member.hashed_password = hashed_password
    if role:
        member.role = role
    await db.commit()
    await db.refresh(member)
    return member

async def delete_member(db: AsyncSession, member: CommitteeMember):
    await db.delete(member)
    await db.commit()

async def list_members(db: AsyncSession):
    result = await db.execute(
        select(CommitteeMember).order_by(CommitteeMember.id)
    )
    return result.scalars().all()


def _hash_token(token: str) -> str:
    """Hash a raw token before storing it."""
    return hashlib.sha256(token.encode()).hexdigest()

async def create_invited_member(db: AsyncSession, email: str, event_id) -> tuple[CommitteeMember, str]:
    """Create a pending member with an invite token. Returns (member, raw_token)."""
    raw_token = secrets.token_urlsafe(32)
    hashed_token = _hash_token(raw_token)
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)

    member = CommitteeMember(
        name="",  # will be set during setup
        email=email,
        hashed_password="PENDING_INVITATION_PLACEHOLDER",
        is_verified=False,
        invite_token=hashed_token,
        invite_expires_at=expires,
        role="member",
        event_id=event_id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member, raw_token

async def get_member_by_invite_token(db: AsyncSession, raw_token: str):
    """Find a member by their raw invite token."""
    hashed = _hash_token(raw_token)
    result = await db.execute(
        select(CommitteeMember).where(CommitteeMember.invite_token == hashed)
    )
    return result.scalar_one_or_none()

async def complete_member_setup(db: AsyncSession, member: CommitteeMember, name: str, hashed_password: str):
    """Finalize account: set name, password, mark verified, clear invite token."""
    member.name = name
    member.hashed_password = hashed_password
    member.is_verified = True
    member.invite_token = None
    member.invite_expires_at = None
    await db.commit()
    await db.refresh(member)
    return member

async def regenerate_invite_token(db: AsyncSession, member: CommitteeMember) -> tuple[CommitteeMember, str]:
    """Regenerate invite token for an existing unverified member."""
    raw_token = secrets.token_urlsafe(32)
    hashed_token = _hash_token(raw_token)
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=48)
    
    member.invite_token = hashed_token
    member.invite_expires_at = expires
    await db.commit()
    await db.refresh(member)
    return member, raw_token