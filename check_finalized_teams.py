import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://kuhu@localhost:5432/eventflow"

async def check():
    engine = create_async_engine(DATABASE_URL)
    try:
        async with engine.begin() as conn:
            # Check finalized_teams
            res_teams = await conn.execute(text("SELECT id, name, challenge, scores_snapshot FROM finalized_teams;"))
            teams = res_teams.fetchall()
            print(f"\n--- Finalized Teams ({len(teams)}) ---")
            for t in teams:
                print(f"Team: {t[1]} | Challenge/Track: '{t[2]}' | Scores Snapshot: {t[3]}")
            
            # Check evaluators
            res_ev = await conn.execute(text("SELECT id, name, email, preferred_categories FROM evaluators;"))
            evs = res_ev.fetchall()
            print(f"\n--- Evaluators ({len(evs)}) ---")
            for e in evs:
                print(f"Judge: {e[1]} | Email: {e[2]} | Pref Categories: {e[3]}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
