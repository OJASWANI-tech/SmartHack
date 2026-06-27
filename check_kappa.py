import asyncio
import os
import sys

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
        # Find all teams named Team Kappa
        t_res = await db.execute(select(Team).where(Team.name == "Team Kappa"))
        teams = t_res.scalars().all()
        print("TEAMS in teams table:")
        for t in teams:
            print(f"  Team ID: {t.id}, Event ID: {t.event_id}, Status: {t.approval_status}")
            
        ft_res = await db.execute(select(FinalizedTeam).where(FinalizedTeam.name == "Team Kappa"))
        fteams = ft_res.scalars().all()
        print("\nTEAMS in finalized_teams table:")
        for ft in fteams:
            print(f"  Finalized Team ID: {ft.id}, team_id (tracks original): {ft.team_id}, Event ID: {ft.event_id}")
            
        s_res = await db.execute(select(Submission))
        subs = s_res.scalars().all()
        print("\nSUBMISSIONS in submissions table:")
        for s in subs:
            # Get team name
            t_name = next((t.name for t in teams if t.id == s.team_id), "Unknown")
            print(f"  Submission ID: {s.id}, Team ID: {s.team_id} ({t_name}), Event ID: {s.event_id}, Stage ID: {s.stage_id}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
