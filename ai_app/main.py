from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict
from ai_app.tasks.llm_tasks import generate_team_rationale
from celery.result import AsyncResult
from ai_app.celery_app import celery_app

app = FastAPI(title="Event Orchestration System")


class TeamMember(BaseModel):
    name: str
    skills: List[str]
    institution: str
    experience_years: int


class TeamRationaleRequest(BaseModel):
    team_id: int
    team_name: str
    members: List[TeamMember]


from fastapi import HTTPException
from celery.exceptions import TimeoutError

@app.post("/api/teams/generate-rationale")
async def create_team_rationale(request: TeamRationaleRequest):
    # Convert Pydantic models to dicts for Celery
    members_data = [member.dict() for member in request.members]
    
    try:
        # 1. Queue the Celery task
        task = generate_team_rationale.apply_async(
            kwargs={
                'team_id': request.team_id,
                'team_name': request.team_name,
                'team_members': members_data
            },
            queue='llm_queue'
        )
        
        # 2. 🌟 WAIT FOR IT: Pause the HTTP request until Celery returns the result
        result = task.get(timeout=30) 
        
        # 3. Return the actual text directly to the React frontend
        return {
            "rationale": result["rationale"],
            "status": "success",
            "team_id": request.team_id
        }
        
    except TimeoutError:
        raise HTTPException(
            status_code=504, 
            detail="AI generation timed out. Worker is busy."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Background AI task failed: {str(e)}"
        )
    
    
@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    """
    Check status of a Celery task
    """
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.ready():
        if task_result.successful():
            return {
                "status": "completed",
                "result": task_result.result
            }
        else:
            return {
                "status": "failed",
                "error": str(task_result.info)
            }
    else:
        return {
            "status": "pending",
            "state": task_result.state
        }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}