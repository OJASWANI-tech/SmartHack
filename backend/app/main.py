import os
import sys
from contextlib import asynccontextmanager

# 1. PATH FIX: Add backend folder so 'app' module can be imported
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_path = os.path.dirname(backend_path)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if root_path not in sys.path:
    sys.path.insert(0, root_path)

# Initialize celery_app to bind Celery task brokers on start
from ai_app.celery_app import celery_app

# =====================================================================
# 🌟 DYNAMIC ASYNC DRIVER DIALECT PATCHER
# =====================================================================
from app.core.config import settings

if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
elif settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://")
# =====================================================================

from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# =====================================================================
# 🌟 DYNAMIC ENGINE LOOKUP LOGIC
# =====================================================================
from app.db.base import Base 
from app.db import session as db_session_module
from app.db.session import AsyncSessionLocal, get_db

engine = None
for engine_name in ["async_engine", "engine", "db_engine", "_engine"]:
    if hasattr(db_session_module, engine_name):
        engine = getattr(db_session_module, engine_name)
        break

if engine is None:
    raise ImportError(
        f"Could not automatically locate the database engine variable in app/db/session.py. "
        f"Available project exports: {dir(db_session_module)}"
    )
# =====================================================================

from app.routers.committee_invite import router as committee_invite_router
from app.routers import auth as auth_router
from app.routers import tokens as tokens_router
from app.routers.google_auth import router as google_auth_router

# ✅ This is our updated file & zip processing router
from app.routers.anti_cheat import router as anti_cheat_router

from app.api.v1.endpoints import (
    events, participants, teams,
    approvals, evaluators, scores,
    leaderboard, communications, activity,
    evaluation, participant_dashboard, announcements, submissions, ask_ai,
    participant_announcements, participant_journey, participant_results,
    evaluator_portal, orchestration, anomalies, mentors, judges, event_knowledge, broadcast,
    grievances, stage_details, challenges, judging_criteria, event_venue, event_faqs,
    mentor_sessions, team_checklist, participant_notifications, ai_analytics, chat,
    dynamic_runtime, dynamic_sports
    # ✂️ REMOVED 'anti_cheat' FROM THIS BULK LIST TO ELIMINATE DUPLICATES AND SCHEMA CONFLATION!
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        print("🔨 Server boot sequence initiated: Verifying database relations...")
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE grievances ADD COLUMN IF NOT EXISTS is_clicked BOOLEAN NOT NULL DEFAULT FALSE;"))
            print("✅ Database migration: added is_clicked column if not exists.")
        except Exception as e:
            print(f"⚠️ Migration note: {e}")
        
        # Migration 005: dynamic event config columns
        try:
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS config_source VARCHAR(20) NOT NULL DEFAULT 'fixed';"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS config_status VARCHAR(30) NOT NULL DEFAULT 'configured';"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS configured_at TIMESTAMPTZ;"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;"))
            print("✅ Migration 005: dynamic event config columns ensured.")
        except Exception as e:
            print(f"⚠️ Migration 005 note: {e}")

        # Migration 008: universal event model columns
        try:
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS event_details JSON DEFAULT '{}'::json;"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS defaults_applied JSON DEFAULT '{}'::json;"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_extracted_entities JSON DEFAULT '{}'::json;"))
            print("✅ Migration 008: universal event model columns ensured.")
        except Exception as e:
            print(f"⚠️ Migration 008 note: {e}")
        # Migration 009: widen judging_criteria.max_score (was NUMERIC(4,2), overflowed on 100-point scoring)
        try:
            await conn.execute(text("ALTER TABLE judging_criteria ALTER COLUMN max_score TYPE NUMERIC(6, 2);"))
            print("✅ Migration 009: widened judging_criteria.max_score to NUMERIC(6,2).")
        except Exception as e:
            print(f"⚠️ Migration 009 note: {e}")

        # Migration 010: sports roster lineup columns on team_members (dynamic sports portal)
        try:
            await conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS position VARCHAR(60);"))
            await conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS jersey_number INTEGER;"))
            await conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS athlete_status VARCHAR(20) NOT NULL DEFAULT 'active';"))
            print("✅ Migration 010: sports roster lineup columns ensured.")
        except Exception as e:
            print(f"⚠️ Migration 010 note: {e}")
        print("✅ Database synchronization complete! All tables are online.")

    # Step 3: RAG indexer
    try:
        from app.services.rag_indexer import index_all_existing_kb
        async with AsyncSessionLocal() as db:
            result = await index_all_existing_kb(db)
            print(f"RAG indexer: {result}")
    except Exception as exc:
        print(f"RAG indexer skipped: {exc}")

    yield

from app.core.limiter import limiter
from slowapi.errors import RateLimitExceeded

app = FastAPI(
    title="EventWiSE Backend",
    description="Intelligent Event Orchestration System",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

app.state.limiter = limiter

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    response = JSONResponse(
        status_code=429,
        content={"detail": f"Too many requests: {exc.detail or 'Please slow down.'}"}
    )
    origin = request.headers.get("origin")
    if origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# =====================================================================
# 🌟 GLOBAL CORS EXCEPTION GUARD MIDDLEWARE
# =====================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print("🚨 UNHANDLED SERVER EXCEPTION DETECTED 🚨")
    traceback.print_exc()
    
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Crash: {str(exc)}"}
    )
    origin = request.headers.get("origin")
    if origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response
# =====================================================================
from app.services.config_agent import router as config_agent_router

# Routers Mapping
app.include_router(events.router, prefix="/api/v1/events", tags=["Events"])
app.include_router(participants.router, prefix="/api/v1/events", tags=["Participants"])
app.include_router(teams.router, prefix="/api/v1/events", tags=["Teams"])
app.include_router(announcements.router, prefix="/api/v1/events", tags=["Team Announcements"])
app.include_router(evaluation.router, prefix="/api/v1/events", tags=["Evaluation"])
app.include_router(approvals.router, prefix="/api/v1/events", tags=["Approvals"])
app.include_router(evaluators.router, prefix="/api/v1/events", tags=["Evaluators"])
app.include_router(scores.router, prefix="/api/v1/events", tags=["Scores"])
app.include_router(leaderboard.router, prefix="/api/v1/events", tags=["Leaderboard"])
app.include_router(communications.router, prefix="/api/v1/events", tags=["Communications"])
app.include_router(activity.router, prefix="/api/v1/events", tags=["Activity"])
app.include_router(participant_dashboard.router, prefix="/api/v1", tags=["Participant portal"])
app.include_router(participant_journey.router, prefix="/api/v1", tags=["Participant portal"])
app.include_router(participant_results.router, prefix="/api/v1", tags=["Participant portal"])
app.include_router(participant_announcements.router, prefix="/api/v1", tags=["Participant portal"])
app.include_router(submissions.router, prefix="/api/v1", tags=["Participant portal"])
app.include_router(ask_ai.router, prefix="/api/v1", tags=["Participant portal"])
app.include_router(evaluator_portal.router, prefix="/api/v1", tags=["Evaluator Portal"])
app.include_router(orchestration.router, prefix="/api/v1/events", tags=["Orchestration"])
app.include_router(anomalies.router, prefix="/api/v1/events", tags=["Anomalies"])
app.include_router(mentors.router, prefix="/api/v1/events", tags=["Mentor Allocation"])
app.include_router(judges.router, prefix="/api/v1/committee", tags=["Judges Management"])
app.include_router(event_knowledge.router, prefix="/api/v1", tags=["Chatbot Knowledge Base"])
app.include_router(broadcast.router, prefix="/api/v1/events", tags=["Global Broadcasts"])
app.include_router(grievances.router, prefix="/api/v1/events", tags=["Grievances"])
app.include_router(stage_details.router, prefix="/api/v1", tags=["Stage Details"])
app.include_router(challenges.router, prefix="/api/v1", tags=["Challenges"])
app.include_router(judging_criteria.router, prefix="/api/v1", tags=["Judging Criteria"])
app.include_router(event_venue.router, prefix="/api/v1", tags=["Event Venue"])
app.include_router(event_faqs.router, prefix="/api/v1", tags=["Event FAQs"])
app.include_router(mentor_sessions.router, prefix="/api/v1", tags=["Mentor Sessions"])
app.include_router(team_checklist.router, prefix="/api/v1", tags=["Team Checklist"])
app.include_router(participant_notifications.router, prefix="/api/v1", tags=["Participant Notifications"])
app.include_router(ai_analytics.router, prefix="/api/v1", tags=["AI Analytics"])

# ✅ Mount our custom file/zip upload engine cleanly with a standard prefix
app.include_router(anti_cheat_router, prefix="/api/v1") 

app.include_router(auth_router.router)
app.include_router(tokens_router.router)
app.include_router(chat.router, prefix="/api/v1", tags=["Team Chat Engine"])
app.include_router(committee_invite_router)
app.include_router(config_agent_router)
# Dynamic event execution engine — serves blueprint schema + generic submit/evaluate.
# Self-contained under /api/dynamic; parallel to the MVP committee/participant/evaluator flows.
app.include_router(dynamic_runtime.router)
app.include_router(dynamic_sports.router)
app.include_router(google_auth_router)

@app.get("/")
async def root():
    return {"message": "EventWiSE Backend is running!"}

@app.get("/health")
async def health():
    return {"status": "healthy"}