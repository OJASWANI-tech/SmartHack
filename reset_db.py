import os
import sys
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

TARGET_DB = "event_orchestration"
ASYNC_DB_URL = f"postgresql+asyncpg://postgres:2005@localhost:5432/{TARGET_DB}"

async def clear_all_table_data():
    """
    Safely empties all rows of data from the tables while keeping 
    the table structures, columns, and indexes completely intact.
    """
    engine = create_async_engine(ASYNC_DB_URL)
    
    print(f"🧹 Initializing data wipe for database: '{TARGET_DB}'...")
    
    # List the exact table names from your database that you want to empty
    # Common SQLAlchemy table naming defaults to lowercase plural, or matches __tablename__
    tables_to_clear = [
        "participants",
        "delivery_logs",
        "finalized_teams",
        # "events",  # Uncomment if you want to wipe events too
        # "teams"    # Add any other tables here
    ]
    
    async with engine.begin() as conn:
        print("⚡ Emptying row registries...")
        
        for table in tables_to_clear:
            try:
                # TRUNCATE removes all rows quickly. 
                # RESTART IDENTITY resets auto-incrementing IDs back to 1.
                # CASCADE handles foreign key dependencies cleanly.
                await conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))
                print(f"🗑️ Cleaned all data from table: '{table}' (IDs reset to 1).")
            except Exception as e:
                # If a table name doesn't exist yet, it skips it gracefully instead of crashing
                print(f"⚠️ Skipped '{table}': {str(e).splitlines()[0]}")
                
    print("✨ Data wipe complete! Your database tables are now completely empty and ready.")
    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(clear_all_table_data())