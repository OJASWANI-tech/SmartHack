import asyncio
from app.db.session import async_engine
# Import the central Declarative Base her models inherit from 
# (Double-check this path to make sure it matches her codebase architecture)
from app.db.base import Base 
from app.models.committee_member import CommitteeMember
from app.models.issued_token import IssuedToken
from app.models.approval_gate import ApprovalGate
from app.models.team import Team

async def run_migrations():
    async with async_engine.begin() as conn:
        print("Synchronizing database architecture...")
        # Automatically registers schema models into postgres layout
        await conn.run_sync(Base.metadata.create_all)
        print("Database synchronization completed perfectly!")

if __name__ == "__main__":
    asyncio.run(run_migrations())
