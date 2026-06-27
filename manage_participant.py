import asyncio
import os
import sys
import argparse

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.participant import Participant

async def list_participants(db: AsyncSession):
    stmt = select(Participant).order_by(Participant.first_name)
    res = await db.execute(stmt)
    participants = res.scalars().all()
    print("\n--- PARTICIPANTS REGISTERED ---")
    for p in participants:
        print(f"ID: {p.id}")
        print(f"  Name: {p.first_name} {p.last_name}")
        print(f"  Email: {p.email}")
        print(f"  Institution: {p.institution}")
        print(f"  Domain: {p.domain}")
        print(f"  Skills: {', '.join(p.skill_tags or [])}")
        print(f"  Experience: {p.experience_level}")
        print("-" * 40)

async def update_participant(db: AsyncSession, p_id_str: str, updates: dict):
    try:
        p_id = uuid.UUID(p_id_str)
    except ValueError:
        print("❌ Invalid UUID format.")
        return

    stmt = select(Participant).where(Participant.id == p_id)
    res = await db.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        print(f"❌ Participant with ID {p_id_str} not found.")
        return

    print("\n--- Current Details ---")
    print(f"Name: {p.first_name} {p.last_name}")
    print(f"Email: {p.email}")
    print(f"Phone: {p.phone}")
    print(f"Institution: {p.institution}")
    print(f"Domain: {p.domain}")
    print(f"Skills: {p.skill_tags}")
    print(f"Experience Level: {p.experience_level}")

    # Apply updates
    for key, val in updates.items():
        if val is not None:
            if key == "skill_tags" and isinstance(val, str):
                val = [s.strip() for s in val.split(",") if s.strip()]
            setattr(p, key, val)
            print(f"🔄 Updated {key} to: {val}")

    await db.commit()
    print("💾 Updates committed successfully!")

async def main():
    parser = argparse.ArgumentParser(description="Manage EventFlow Participants")
    parser.add_argument("--list", action="store_true", help="List all participants")
    parser.add_argument("--id", type=str, help="Participant UUID to update")
    parser.add_argument("--first-name", type=str, help="Update first name")
    parser.add_argument("--last-name", type=str, help="Update last name")
    parser.add_argument("--email", type=str, help="Update email")
    parser.add_argument("--phone", type=str, help="Update phone")
    parser.add_argument("--institution", type=str, help="Update institution")
    parser.add_argument("--domain", type=str, help="Update domain (e.g. ai, backend, design)")
    parser.add_argument("--skills", type=str, help="Comma-separated skills (e.g. Python,React)")
    parser.add_argument("--experience", type=str, choices=["beginner", "intermediate", "advanced"], help="Update experience level")

    args = parser.parse_args()

    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://")
        
    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    import uuid
    async with AsyncSessionLocal() as db:
        if args.list:
            await list_participants(db)
        elif args.id:
            updates = {
                "first_name": args.first_name,
                "last_name": args.last_name,
                "email": args.email,
                "phone": args.phone,
                "institution": args.institution,
                "domain": args.domain,
                "skill_tags": args.skills,
                "experience_level": args.experience
            }
            # Filter out None values
            updates = {k: v for k, v in updates.items() if v is not None}
            if updates:
                await update_participant(db, args.id, updates)
            else:
                print("❌ No updates specified. Provide update flags like --first-name, --skills, etc.")
        else:
            parser.print_help()
            
    await engine.dispose()

if __name__ == "__main__":
    if len(sys.argv) == 1:
        # Default behavior: run interactively if no arguments provided
        class InteractiveArgs:
            list = True
            id = None
        asyncio.run(main())
    else:
        asyncio.run(main())
