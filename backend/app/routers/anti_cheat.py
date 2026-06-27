import io
import os
import sys
import uuid
import zipfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

# Path configuration initialization
project_root = Path(__file__).resolve().parents[3]
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from ai_app.celery_app import celery_app
from app.db.session import get_db

# Models
from app.models.anti_cheat import AntiCheatReport
from app.models.submission import Submission

# Schemas
from app.schemas.anti_cheat import AntiCheatResponse

# 🎯 Explicitly import the background task to secure perfect name alignment over Redis
from ai_app.tasks.anti_cheat_tasks import run_plagiarism_scan

router = APIRouter(prefix="/anti-cheat", tags=["Anti-Cheat / Plagiarism Engine"])

SUPPORTED_EXTENSIONS = {".py", ".java", ".c", ".cpp", ".cc", ".js", ".ts"}


def convert_db_submissions_to_zip(submissions: list) -> io.BytesIO:
    """
    Compiles relational submission rows and nested JSON payloads into 
    an isolated, in-memory zip archive container stream.
    """
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for sub in submissions:
            # Fallback to team ID string if relational team object is not loaded or missing
            team_folder = sub.team.name if (hasattr(sub, "team") and sub.team) else str(sub.team_id)
            
            # Extract payload details safely
            payload = sub.submission_payload or {}
            file_list = payload.get("files", [])
            
            if not isinstance(file_list, list):
                continue

            for file_entry in file_list:
                filename = file_entry.get("filename")
                source_code = file_entry.get("source_code")
                
                if filename and source_code:
                    # Structure files internally under their respective team name directories
                    virtual_path = f"{team_folder}/{filename}"
                    archive.writestr(virtual_path, source_code)
                    
    zip_buffer.seek(0)
    return zip_buffer


# --- ⚡ COMPILE SUBMISSIONS ON THE FLY & RUN CELERY PLAGIARISM ENGINE ---
@router.post("/{event_id}/scan", status_code=status.HTTP_202_ACCEPTED)
async def trigger_plagiarism_scan(
    event_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Queries actual event submissions, extracts text code from JSON payloads, 
    compiles an in-memory zip archive, and schedules background worker scans.
    """
    # 1. Fetch all submissions matching this event ID
    query = (
        select(Submission)
        .filter(Submission.event_id == event_id)
        .options(selectinload(Submission.team))  
    )
    result = await db.execute(query)
    db_submissions = result.scalars().all()

    if len(db_submissions) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 separate team submissions are required to compile an evaluation matrix."
        )

    # 2. Compile everything dynamically into a virtual memory zip archive block
    zip_stream = convert_db_submissions_to_zip(db_submissions)

    # 3. Extract into processing dictionary data structures for the report table
    submission_dataset = {}
    try:
        with zipfile.ZipFile(zip_stream) as archive:
            for zip_info in archive.infolist():
                if zip_info.is_dir():
                    continue

                file_ext = os.path.splitext(zip_info.filename)[1].lower()
                if file_ext not in SUPPORTED_EXTENSIONS:
                    continue

                with archive.open(zip_info.filename) as source_file:
                    submission_dataset[zip_info.filename] = {
                        "code": source_file.read().decode("utf-8", errors="ignore"),
                        "ext": file_ext,
                    }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing internal virtual memory buffer stream: {str(exc)}",
        )

    if len(submission_dataset) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The active submission dataset contains insufficient valid source files to evaluate."
        )

    # 4. Populate and commit the tracking context to the database
    generated_task_id = str(uuid.uuid4())
    db_report = AntiCheatReport(
        event_id=event_id,
        task_id=generated_task_id,
        status="PROCESSING",
        matches={"raw_submissions": submission_dataset},
    )
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)

    # 5. Dispatch message using the imported task function. 
    # This automatically guarantees name alignment in the 'llm_queue'!
    run_plagiarism_scan.apply_async(
        kwargs={
            "report_id": db_report.id, 
            "event_id": event_id
        },
        task_id=generated_task_id,
        queue="llm_queue",
    )

    return {
        "status": "PROCESSING",
        "task_id": generated_task_id,
        "message": f"Successfully compiled {len(submission_dataset)} code assets into evaluation context.",
    }


# --- 📊 FETCH COMPLETED PLAGIARISM METRIC RESULTS ---
@router.get("/{event_id}/results", response_model=Optional[AntiCheatResponse])
async def get_latest_plagiarism_report(
    event_id: str,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(AntiCheatReport)
        .filter(AntiCheatReport.event_id == event_id)
        .order_by(AntiCheatReport.id.desc())
    )
    result = await db.execute(query)
    report = result.scalars().first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching plagiarism report data found for this event index.",
        )

    return {
        "status": report.status,
        "total_flagged_pairs": len(report.matches.get("matches", [])) if isinstance(report.matches, dict) else 0,
        "matches": report.matches.get("matches", []) if isinstance(report.matches, dict) else [],
        "task_id": report.task_id,
        "event_id": report.event_id,
        "created_at": report.created_at
    }