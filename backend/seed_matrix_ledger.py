import sys
import uuid
import json
import asyncio
import asyncio.runners
from datetime import datetime, timezone

# Force load core asyncio completely into memory BEFORE third party tools
if not hasattr(asyncio, 'Runner') and hasattr(asyncio.runners, 'Runner'):
    asyncio.Runner = asyncio.runners.Runner

# 🎯 FIXED: Appended the missing '7' to ensure a valid 36-character hexadecimal UUID string
EVENT_ID = uuid.UUID("2be69a68-e5a9-412e-9fa3-2b497f2861f7")

# 🎯 Configured dataset containing scores and anomaly configurations
MOCK_DATASET = {
    "Team Alpha": {"anomaly": False, "base": [6, 6, 6, 6]},
    "Team Beta": {
        "anomaly": True, 
        "type": "code_quality", 
        "base": [7, 7, 7, 6], 
        "rogue": [7, 1, 7, 6]  # The final panel judge drops a 1 for code quality, causing a divergence
    },
    "Team Mu": {"anomaly": False, "base": [6, 6, 6, 6]},
    "Team Kappa": {"anomaly": False, "base": [7, 7, 7, 7]},
    "Team Theta": {"anomaly": False, "base": [7, 7, 8, 7]},
    "Team Eta": {"anomaly": False, "base": [5, 6, 5, 5]},
    "Team Gamma": {"anomaly": False, "base": [7, 6, 7, 7]},
    "Team Epsilon": {"anomaly": False, "base": [6, 7, 7, 7]},
    "Team Delta": {"anomaly": True, "type": "code_quality", "base": [8, 9, 8, 8], "rogue": [7, 2, 7, 6]},
    "Team Iota": {"anomaly": False, "base": [6, 7, 6, 7]},
    "Team Zeta": {"anomaly": True, "type": "presentation", "base": [8, 8, 9, 8], "rogue": [6, 7, 1, 7]}
}

async def seed_full_matrix():
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select, text
    from app.core.config import settings
    from app.models.finalized_team import FinalizedTeam

    database_url = settings.DATABASE_URL
    if database_url:
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        elif database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql+asyncpg://")

    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        print("🔍 Fetching all finalized teams registered to the event layout...")
        stmt = select(FinalizedTeam)
        result = await db.execute(stmt)
        teams = result.scalars().all()
        
        print(f"📦 Found {len(teams)} teams. Processing snapshot metrics and raw mapping data...")
        
        teams_data = []
        for t in teams:
            # 🎯 FIXED: Safely load existing judge names dynamically from the DB row skeleton
            existing_snapshot = t.scores_snapshot
            if isinstance(existing_snapshot, str):
                try:
                    existing_snapshot = json.loads(existing_snapshot)
                except Exception:
                    existing_snapshot = []
            
            # Extract real assigned judge names from the pre-existing database record skeleton
            real_judges = [j["judge_name"] for j in existing_snapshot if "judge_name" in j] if existing_snapshot else []
            
            # Fallback array just in case a database row snapshot structure is empty or missing keys
            if not real_judges:
                real_judges = ["Judge Alpha", "Judge Beta", "Judge Gamma"]

            teams_data.append({
                "id": t.id,
                "name": t.name,
                "team_id": t.team_id,
                "event_id": t.event_id,
                "judges": real_judges  # Attaches individual panel details to current loop contextualization
            })

        for t_info in teams_data:
            cfg = MOCK_DATASET.get(t_info["name"])
            if not cfg:
                print(f"⚠️ {t_info['name']} has no assigned profile entry in MOCK_DATASET. Skipping.")
                continue
                
            scores_snapshot = []
            base = cfg["base"]
            panel_judges = t_info["judges"]  # 🎯 Contextualize real panel layout for loop step
            num_judges = len(panel_judges)
            
            # --- Scenario A: Process Normal Distributed Scores ---
            if not cfg["anomaly"]:
                for i, j_name in enumerate(panel_judges):
                    offset = (i - 1) if num_judges > 1 else 0  # small realistic variances between judges
                    s = {
                        "judge_name": j_name,  # 🟢 Uses real judge name dynamically
                        "innovation": float(max(1, min(10, base[0] + offset))),
                        "code_quality": float(max(1, min(10, base[1] - offset))),
                        "presentation": float(max(1, min(10, base[2] + offset))),
                        "impact": float(max(1, min(10, base[3])))
                    }
                    s["total"] = sum([s["innovation"], s["code_quality"], s["presentation"], s["impact"]])
                    scores_snapshot.append(s)
                
                has_active_anomaly = False
                anomaly_details = None
                
            # --- Scenario B: Process Anomaly Scoring Matrices ---
            else:
                # First panel judges score normally up to the final rogue judge
                for i in range(num_judges - 1):
                    s = {
                        "judge_name": panel_judges[i],  # 🟢 Uses real judge name dynamically
                        "innovation": float(base[0]), 
                        "code_quality": float(base[1]),
                        "presentation": float(base[2]), 
                        "impact": float(base[3]),
                        "total": float(sum(base))
                    }
                    scores_snapshot.append(s)
                
                # The final judge on this specific panel drops a highly anomalous rogue score
                rogue = cfg["rogue"]
                r_s = {
                    "judge_name": panel_judges[-1],  # 🟢 Pinpoints actual judge name as outlier
                    "innovation": float(rogue[0]), 
                    "code_quality": float(rogue[1]),
                    "presentation": float(rogue[2]), 
                    "impact": float(rogue[3]),
                    "total": float(sum(rogue))
                }
                scores_snapshot.append(r_s)
                
                has_active_anomaly = True
                delta = round(abs(base[1] - rogue[1]) if cfg["type"] == "code_quality" else abs(base[2] - rogue[2]), 2)
                anomaly_details = {"judge": panel_judges[-1], "dimension": cfg["type"], "delta": float(delta)}
 
            # Generate aggregate calculations
            innovations = [s["innovation"] for s in scores_snapshot]
            codes = [s["code_quality"] for s in scores_snapshot]
            presentations = [s["presentation"] for s in scores_snapshot]
            impacts = [s["impact"] for s in scores_snapshot]
            totals = [s["total"] for s in scores_snapshot]
 
            p_inn = round(sum(innovations)/num_judges, 2)
            p_cod = round(sum(codes)/num_judges, 2)
            p_pre = round(sum(presentations)/num_judges, 2)
            p_imp = round(sum(impacts)/num_judges, 2)
            final_total = round(sum(totals)/num_judges, 2)
 
            # Update the finalized_teams table with calculated scores
            update_stmt = text("""
                UPDATE finalized_teams 
                SET scores_snapshot = CAST(:snapshot AS jsonb), 
                    final_calculated_total = :total,
                    panel_average_innovation = :p_inn, 
                    panel_average_code = :p_cod,
                    panel_average_presentation = :p_pre, 
                    panel_average_impact = :p_imp,
                    has_active_anomaly = :has_an, 
                    anomaly_details = CAST(:an_det AS jsonb),
                    is_corrected = false,
                    correction_note = null
                WHERE id = :id
            """)
            
            await db.execute(update_stmt, {
                "snapshot": json.dumps(scores_snapshot), "total": final_total,
                "p_inn": p_inn, "p_cod": p_cod, "p_pre": p_pre, "p_imp": p_imp,
                "has_an": has_active_anomaly, "an_det": json.dumps(anomaly_details) if anomaly_details else None, 
                "id": t_info["id"]
            })
            
            # Insert a record into the dedicated score_anomalies tracking table
            if cfg["anomaly"]:
                delta = round(abs(cfg["base"][1] - cfg["rogue"][1]) if cfg["type"] == "code_quality" else abs(cfg["base"][2] - cfg["rogue"][2]), 2)
                outlier_judge = panel_judges[-1]
                
                raw_insert = text("""
                    INSERT INTO score_anomalies (id, event_id, team_id, severity, divergence_score, ai_reasoning, resolution_status, created_at)
                    VALUES (:id, :event_id, :team_id, :severity, :divergence_score, :ai_reasoning, :resolution_status, :created_at)
                    ON CONFLICT (id) DO NOTHING
                """)
                await db.execute(raw_insert, {
                    "id": uuid.uuid4(), 
                    "event_id": t_info["event_id"], 
                    "team_id": t_info["id"], 
                    "severity": "high" if delta > 5 else "medium", 
                    "divergence_score": float(delta),
                    "ai_reasoning": f"Divergence detected for {t_info['name']}: {outlier_judge} evaluation for '{cfg['type']}' is an extreme statistical outlier.",
                    "resolution_status": "unresolved", 
                    "created_at": datetime.now(timezone.utc)
                })
                print(f"🚨 Anomaly flagged and recorded for {t_info['name']} via {outlier_judge} (Divergence: {delta}) under Event {t_info['event_id']}.")
 
        await db.commit()
        print("💾 Matrix commit successful! All matching database slots populated cleanly with scores.")
        
    await engine.dispose()

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(seed_full_matrix())
    finally:
        loop.close()