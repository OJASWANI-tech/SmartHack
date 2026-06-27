import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.evaluator import Evaluator
from app.models.finalized_team import FinalizedTeam
from app.models.team import Team
from app.models.evaluator_assignment import EvaluatorAssignment
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
        evaluators = (await db.execute(select(Evaluator))).scalars().all()
        assignments = (await db.execute(select(EvaluatorAssignment))).scalars().all()
        finalized = (await db.execute(select(FinalizedTeam))).scalars().all()
        teams = (await db.execute(select(Team))).scalars().all()
        
        print("--- EVALUATOR ASSIGNMENTS ---")
        for ass in assignments:
            eval_name = next((ev.name for ev in evaluators if ev.id == ass.evaluator_id), "Unknown")
            # Is the assigned team_id in finalized_teams or teams?
            team_in_staging = next((t.name for t in teams if t.id == ass.team_id), None)
            team_in_finalized = next((ft.name for ft in finalized if ft.team_id == ass.team_id), None)
            print(f"Assigned ID: {ass.id}, Evaluator: {eval_name}, Team ID: {ass.team_id}")
            print(f"  * In Staging teams table: {team_in_staging}")
            print(f"  * In Finalized teams table: {team_in_finalized}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
