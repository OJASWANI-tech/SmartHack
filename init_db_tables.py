import os
import sys
import asyncio

# Setup module search pathways cleanly
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from sqlalchemy.ext.asyncio import create_async_engine
from app.db.base import Base  
from app.models.finalized_team import FinalizedTeam 

# 🔌 Update this connection string if your local PostgreSQL details are different!
DATABASE_URL = "postgresql+asyncpg://postgres:postgres123@db:5432/EventWiSE"


async def init_models():
    # We create a local, dedicated engine right here to bypass the session import error
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.begin() as conn:
            print("\n🔄 Synchronizing database structures with SQLAlchemy models...")
            
            # Looks for any missing tables (like finalized_teams) and creates them
            await conn.run_sync(Base.metadata.create_all)
            
            print("🚀 Success! 'finalized_teams' relation table successfully provisioned.\n")
    finally:
        # Clean up engine connection pools safely
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_models())