import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor

# 1. Direct Imports from your backend application code
from ai_app.celery_app import celery_app
from ai_app.tasks.llm_tasks import generate_team_rationale
from celery.result import AsyncResult


DB_CONFIG = {
    "dbname": "event_orchestration",
    "user": "user",
    "password": "2005",
    "host": "localhost",
    "port": "5432"
}

def fetch_team_data_from_db():
    """Connects to Postgres and extracts data dynamically for an unanalyzed team."""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
       
        cursor.execute("SELECT id, name FROM teams WHERE llm_rationale IS NULL LIMIT 1;")
        team = cursor.fetchone()
        
        if not team:
            print("✨ All teams in the database have already been evaluated!")
            return None

        team_id = team['id']
        team_name = team['name']
        print(f"📋 Found team row in DB: {team_name} (UUID: {team_id})")

      
        cursor.execute("""
            SELECT p.first_name, p.last_name, p.skill_tags, p.institution, p.experience_level
            FROM participants p
            JOIN team_members tm ON p.id = tm.participant_id
            WHERE tm.team_id = %s;
        """, (team_id,))
        db_members = cursor.fetchall()

        formatted_members = []
        for m in db_members:
            exp_years = 1
            if m['experience_level'] == 'advanced':
                exp_years = 3
            elif m['experience_level'] == 'intermediate':
                exp_years = 2

            formatted_members.append({
                "name": f"{m['first_name']} {m['last_name']}",
                "skills": m['skill_tags'] if m['skill_tags'] is not None else [],
                "institution": m['institution'] or "Unknown Institution",
                "experience_years": exp_years
            })

        return {
            "team_id": 1, 
            "team_name": team_name,
            "team_members": formatted_members,
            "real_db_uuid": team_id 
        }

    finally:
        cursor.close()
        conn.close()

def update_db_rationale(team_uuid, rationale_text):
    """Writes the completed Claude AI text back to your Postgres row."""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE teams SET llm_rationale = %s, updated_at = NOW() WHERE id = %s;",
            (rationale_text, team_uuid)
        )
        conn.commit()
        print(f"💾 Permanently saved rationale to PostgreSQL for team ID: {team_uuid}")
    finally:
        cursor.close()
        conn.close()

# ==========================================
#              CORE EXECUTION
# ==========================================

payload = fetch_team_data_from_db()

if payload:
    db_uuid = payload.pop("real_db_uuid") 
    
    print("🚀 Dispatching task directly to Redis broker via Celery...")
    
   
    task = generate_team_rationale.apply_async(
        kwargs={
            'team_id': payload['team_id'],
            'team_name': payload['team_name'],
            'team_members': payload['team_members']
        },
        queue='llm_queue'
    )
    
    task_id = task.id
    print(f"📡 Task pushed successfully! Assigned Celery Task ID: {task_id}")
    print("⏳ Polling Redis backend for response state updates...")

    # 4. Poll the worker state directly using the native AsyncResult tracker
    while True:
        task_result = AsyncResult(task_id, app=celery_app)
        
        if task_result.ready():
            if task_result.successful():
                result_data = task_result.result
                generated_rationale = result_data['rationale']
                
                print("\n=== Generated Rationale from Claude ===")
                print(generated_rationale)
                
                # Write the response directly back to the Postgres row
                update_db_rationale(db_uuid, generated_rationale)
                break
            else:
                print(f"❌ Celery worker task failed: {task_result.info}")
                break
        else:
            print("Status: pending/processing...")
            
        time.sleep(2)