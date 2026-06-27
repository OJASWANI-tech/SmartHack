# test_plag_pipeline.py
import os
import sys
import asyncio
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.models.submission import Submission

TARGET_DB = "event_orchestration"
DATABASE_URL = f"postgresql+asyncpg://postgres:2005@localhost:5432/{TARGET_DB}"

async def insert_mock_data():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # 🆔 Fixed tracking ID matching your target Swagger endpoint route
    MOCK_EVENT_ID = uuid.UUID("badb3f6d-e00c-4f6e-8c43-f8ee200631b3")
    
    # Code metrics packages
    team_1_files = {
        "files": [
            {
                "filename": "solution.py",
                "source_code": "def process_data(arr):\n    res = []\n    for x in arr:\n        if x % 2 == 0:\n            res.append(x * 2)\n    return res"
            }
        ]
    }
    
    team_2_files = {
        "files": [
            {
                "filename": "main_logic.py",
                "source_code": "def process_data(numbers):\n    output = []\n    for n in numbers:\n        if n % 2 == 0:\n            output.append(n * 2)\n    return output"
            }
        ]
    }

    async with async_session() as session:
        async with session.begin():
            print("🔓 Temporarily deferring relational foreign key validations...")
            # Defer constraints so Postgres allows inserting into submissions directly
            await session.execute(text("SET CONSTRAINTS ALL DEFERRED;"))

            print("💾 Populating mock submission models directly into target registries...")
            sub1 = Submission(
                id=uuid.uuid4(),
                event_id=MOCK_EVENT_ID,
                stage_id=uuid.uuid4(),
                team_id=uuid.uuid4(),
                participant_id=uuid.uuid4(),
                submission_type="code",
                submission_payload=team_1_files,
                status="submitted"
            )
            
            sub2 = Submission(
                id=uuid.uuid4(),
                event_id=MOCK_EVENT_ID,
                stage_id=uuid.uuid4(),
                team_id=uuid.uuid4(),
                participant_id=uuid.uuid4(),
                submission_type="code",
                submission_payload=team_2_files,
                status="submitted"
            )
            
            session.add_all([sub1, sub2])
            
        print(f"\n✅ Mock submission assets successfully inserted for Event ID: {MOCK_EVENT_ID}\n")
        
    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(insert_mock_data())