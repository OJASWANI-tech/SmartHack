import asyncio
import os
import sys

# Add backend directory to sys.path to make imports work
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.team import Team
from app.models.finalized_team import FinalizedTeam
from app.models.submission import Submission

async def main():
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://")
        
    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        teams = (await db.execute(select(Team))).scalars().all()
        finalized = (await db.execute(select(FinalizedTeam))).scalars().all()
        submissions = (await db.execute(select(Submission))).scalars().all()
        
        print("--- TEAMS ---")
        for t in teams:
            print(f"Team ID: {t.id}, Name: {t.name}")
            
        print("\n--- FINALIZED TEAMS ---")
        for ft in finalized:
            print(f"Finalized Team ID: {ft.id}, team_id (tracks original): {ft.team_id}, Name: {ft.name}")
            
        print("\n--- SUBMISSIONS ---")
        for s in submissions:
            print(f"Submission ID: {s.id}, team_id: {s.team_id}, PPT URL: {s.ppt_url}, Github URL: {s.github_url}, Demo Video URL: {s.demo_video_url}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
