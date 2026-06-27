import asyncio
import os
import sys

# 1. Route strictly to the backend directory structure
current_dir = os.path.dirname(os.path.abspath(__file__))
# Check if we are running from root or inside backend already
if os.path.exists(os.path.join(current_dir, "backend")):
    root_path = os.path.join(current_dir, "backend")
else:
    root_path = current_dir

if root_path not in sys.path:
    sys.path.insert(0, root_path)

# 2. Set driver protocol string patch BEFORE importing anything else
from app.core.config import settings
if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# 3. Dynamic Import Guard for the DB Engine
from app.db import session as db_session_module

db_engine = None
for engine_name in ["engine", "async_engine", "db_engine", "_engine"]:
    if hasattr(db_session_module, engine_name):
        db_engine = getattr(db_session_module, engine_name)
        break

if db_engine is None:
    raise ImportError(
        "Could not find a valid database engine variable inside app/db/session.py. "
        f"Available attributes are: {dir(db_session_module)}"
    )

# 4. Import the declarative metadata base
from app.db.base import Base

# 🚨 CRITICAL FIX: You MUST import the Broadcast model class here!
# This tells SQLAlchemy's metadata cache to register the "broadcasts" table schema layout.
try:
    from app.models.broadcast import Broadcast
    print("📦 Broadcast table metadata successfully registered.")
except ImportError as e:
    raise ImportError(
        f"Failed to find the broadcast model at app/models/broadcast.py. Exception details: {e}"
    )

async def create_tables():
    async with db_engine.begin() as conn:
        print("🔨 Communicating with PostgreSQL cluster...")
        # create_all will automatically skip tables that already exist (like events)
        # and safely create any tables that are missing (like broadcasts)
        await conn.run_sync(Base.metadata.create_all)
        print("✅ The 'broadcasts' table has been physically generated directly in the DB!")

if __name__ == "__main__":
    asyncio.run(create_tables())