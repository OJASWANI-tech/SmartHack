from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.approval_gate import ApprovalGate
from app.models.team import Team
from app.schemas.common import ApprovalGateRead, ApprovalAction, MessageResponse
from typing import List
from datetime import datetime
import uuid
from app.services.activity_log import log_action

router = APIRouter()


@router.get("/{event_id}/approvals", response_model=List[ApprovalGateRead])
async def list_approvals(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ApprovalGate)
        .where(ApprovalGate.event_id == event_id)
        .order_by(ApprovalGate.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{event_id}/approvals/{gate_id}/approve", response_model=MessageResponse)
async def approve_gate(
    event_id: uuid.UUID,
    gate_id: uuid.UUID,
    payload: ApprovalAction,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApprovalGate).where(
            ApprovalGate.id == gate_id,
            ApprovalGate.event_id == event_id,
        )
    )
    gate = result.scalar_one_or_none()
    if not gate:
        raise HTTPException(status_code=404, detail="Approval gate not found")
    if gate.status != "pending":
        raise HTTPException(status_code=400, detail=f"Gate is already {gate.status}")

    gate.status = "approved"
    gate.committee_note = payload.committee_note
    gate.resolved_at = datetime.utcnow()

    if gate.gate_type == "team_formation":
        teams_result = await db.execute(
            select(Team).where(
                Team.event_id == event_id,
                Team.approval_status == "proposed",
            )
        )
        teams = teams_result.scalars().all()
        for team in teams:
            team.approval_status = "approved"
            team.approved_at = datetime.utcnow()

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Approval",
        action=f"Approval gate '{gate.gate_type}' approved by committee",
        actor="Admin Portal",
        meta={"gate_id": str(gate_id)}
    )
    await db.commit()
    return {"message": "Gate approved successfully.", "detail": gate.gate_type}


@router.post("/{event_id}/approvals/{gate_id}/reject", response_model=MessageResponse)
async def reject_gate(
    event_id: uuid.UUID,
    gate_id: uuid.UUID,
    payload: ApprovalAction,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApprovalGate).where(
            ApprovalGate.id == gate_id,
            ApprovalGate.event_id == event_id,
        )
    )
    gate = result.scalar_one_or_none()
    if not gate:
        raise HTTPException(status_code=404, detail="Approval gate not found")
    if gate.status != "pending":
        raise HTTPException(status_code=400, detail=f"Gate is already {gate.status}")

    gate.status = "rejected"
    gate.committee_note = payload.committee_note
    gate.resolved_at = datetime.utcnow()

    await log_action(
        db=db,
        event_id=event_id,
        action_type="Approval",
        action=f"Approval gate '{gate.gate_type}' rejected by committee",
        actor="Admin Portal",
        meta={"gate_id": str(gate_id)}
    )
    await db.commit()
    return {"message": "Gate rejected.", "detail": payload.committee_note}