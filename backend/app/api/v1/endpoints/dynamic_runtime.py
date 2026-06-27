"""
dynamic_runtime.py — The /api/dynamic execution engine.

Serves an approved EventBlueprint as a single render-ready schema and provides
generic, payload-agnostic submission + evaluation routes. This is the runtime
counterpart to the config-agent: the agent *builds* the event, this *runs* it.

Everything here is keyed off the normalized blueprint that config_agent.commit
already wrote (Event + Stage[] + JudgingCriterion[] + EventScoringConfig +
EventTeamFormationConfig + EventPortalConfig). Submissions and evaluations land
in the parallel dynamic_submissions / dynamic_evaluations tables so this track
never touches the MVP /participant or /evaluator data.

Routes (prefix /api/dynamic):
  GET  /event/{event_id}                 -> full structural schema for rendering
  POST /event/{event_id}/submit          -> generic submission intake
  GET  /event/{event_id}/submissions     -> list submissions (+ their evaluations)
  POST /event/{event_id}/evaluate        -> generic rubric-mapped scoring
  GET  /event/{event_id}/results         -> aggregated leaderboard
"""

from __future__ import annotations

import uuid
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.event import Event
from app.models.stage import Stage
from app.models.judging_criteria import JudgingCriterion
from app.models.event_scoring_config import EventScoringConfig
from app.models.event_team_formation_config import EventTeamFormationConfig
from app.models.event_portal_config import EventPortalConfig
from app.models.dynamic_submission import DynamicSubmission
from app.models.dynamic_evaluation import DynamicEvaluation
from app.services.config_agent import normalize_event_type

router = APIRouter(prefix="/api/dynamic", tags=["dynamic-runtime"])


# ─────────────────────────────────────────────────────────────────────────────
# Metadata-driven UI presets — these turn an event_type into the concrete set of
# submission fields a participant portal should render. engine_config.required_fields
# on a stage (set by the config-agent) overrides the preset when present.
# ─────────────────────────────────────────────────────────────────────────────
def _field(key, label, ftype, required=False, placeholder=""):
    return {"key": key, "label": label, "type": ftype, "required": required, "placeholder": placeholder}


SUBMISSION_FIELD_PRESETS: dict[str, dict] = {
    "coding_contest": {
        "submission_type": "repo",
        "fields": [
            _field("repo_url", "Repository / Code URL", "url", True, "https://github.com/..."),
            _field("language", "Primary Language", "text", False, "Python"),
            _field("notes", "Notes for Evaluators", "textarea", False),
        ],
    },
    "hackathon": {
        "submission_type": "repo",
        "fields": [
            _field("repo_url", "Repository URL", "url", True, "https://github.com/..."),
            _field("demo_url", "Live Demo / Video URL", "url", False),
            _field("notes", "Project Summary", "textarea", False),
        ],
    },
    "case_competition": {
        "submission_type": "document",
        "fields": [
            _field("deck_url", "Slide Deck / PDF URL", "url", True, "https://..."),
            _field("abstract", "Executive Abstract", "textarea", True),
        ],
    },
    "debate": {
        "submission_type": "text",
        "fields": [
            _field("stance", "Stance / Position", "text", True, "For / Against"),
            _field("opening", "Opening Statement", "textarea", False),
            _field("rebuttal", "Rebuttal Notes", "textarea", False),
        ],
    },
    "mun": {
        "submission_type": "text",
        "fields": [
            _field("position_paper_url", "Position Paper URL", "url", True),
            _field("country", "Delegation / Country", "text", True),
        ],
    },
    "sports_tournament": {
        "submission_type": "roster",
        "fields": [
            _field("roster", "Team Roster (one player per line)", "textarea", True),
            _field("match_score", "Match Score (if reporting a result)", "text", False, "21 - 18"),
        ],
    },
}

DEFAULT_SUBMISSION_PRESET = {
    "submission_type": "generic",
    "fields": [
        _field("link", "Submission Link", "url", True),
        _field("notes", "Notes", "textarea", False),
    ],
}


def _submission_spec(event_type: str, active_stage: Optional[Stage]) -> dict:
    """Resolve the metadata-driven submission field set for the active phase."""
    preset = SUBMISSION_FIELD_PRESETS.get(event_type, DEFAULT_SUBMISSION_PRESET)
    spec = {"submission_type": preset["submission_type"], "fields": [dict(f) for f in preset["fields"]]}

    # A config-agent stage can pin its own required_fields / accepts — honor them.
    cfg = (active_stage.engine_config if active_stage else None) or {}
    required = cfg.get("required_fields")
    if isinstance(required, list) and required:
        known = {f["key"] for f in spec["fields"]}
        for r in required:
            if r not in known:
                spec["fields"].append(_field(r, r.replace("_", " ").title(), "text", True))
            else:
                for f in spec["fields"]:
                    if f["key"] == r:
                        f["required"] = True
    return spec


async def _load_event(db: AsyncSession, event_id: str) -> Event:
    try:
        eid = uuid.UUID(str(event_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid event id.")
    event = (await db.execute(select(Event).where(Event.id == eid))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


# ─────────────────────────────────────────────────────────────────────────────
# GET /event/{event_id} — the single render-ready structural schema
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/event/{event_id}")
async def get_event_schema(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)
    etype = normalize_event_type(event.event_type)

    stages = (
        await db.execute(
            select(Stage).where(Stage.event_id == event.id).order_by(Stage.sequence_order)
        )
    ).scalars().all()

    criteria = (
        await db.execute(
            select(JudgingCriterion)
            .where(JudgingCriterion.event_id == event.id)
            .order_by(JudgingCriterion.sort_order)
        )
    ).scalars().all()

    scoring = (
        await db.execute(select(EventScoringConfig).where(EventScoringConfig.event_id == event.id))
    ).scalar_one_or_none()
    team_cfg = (
        await db.execute(select(EventTeamFormationConfig).where(EventTeamFormationConfig.event_id == event.id))
    ).scalar_one_or_none()
    portal = (
        await db.execute(select(EventPortalConfig).where(EventPortalConfig.event_id == event.id))
    ).scalar_one_or_none()

    phases = [
        {
            "id": str(s.id),
            "name": s.name,
            "sequence": s.sequence_order,
            "engine_type": s.engine_type,
            "stage_type": s.stage_type,
            "engine_config": s.engine_config or {},
            "status": s.status,
            "audience": s.audience,
            "is_system": bool(s.is_system_phase),
            "approval_required": bool(s.approval_required),
            "instructions": s.instructions,
        }
        for s in stages
    ]

    # The phase a participant actually submits into: first non-system SUBMISSION
    # phase, else first non-system phase, else first phase.
    active_stage = next(
        (s for s in stages if not s.is_system_phase and s.engine_type == "SUBMISSION"),
        next((s for s in stages if not s.is_system_phase), stages[0] if stages else None),
    )
    submission_spec = _submission_spec(etype, active_stage)

    evaluation_model = {
        "criteria": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "weight": float(c.weight) if c.weight is not None else 0.0,
                "max_score": float(c.max_score) if c.max_score is not None else 10.0,
            }
            for c in criteria
        ],
        "aggregation": (scoring.aggregation_method if scoring else "weighted_average"),
        "score_range": [
            float(scoring.score_scale_min) if scoring else 0.0,
            float(scoring.score_scale_max) if scoring else 10.0,
        ],
        "judges_per_entity": (scoring.judges_per_team if scoring else 2),
        "qualitative_feedback": (bool(scoring.qualitative_feedback) if scoring else True),
    }

    team_rules = {
        "mode": event.event_mode_type or "team",
        "min_size": (team_cfg.min_size if team_cfg else 1),
        "max_size": (team_cfg.max_size if team_cfg else 1),
        "factors": (list(team_cfg.factors) if team_cfg and team_cfg.factors else []),
    }

    ui_config = {
        "submission_type": submission_spec["submission_type"],
        "submission_fields": submission_spec["fields"],
        "rubric_kind": "criteria_sliders",  # one slider per JudgingCriterion
        "evaluator_role_label": (portal.evaluator_role_label if portal else "Evaluator"),
        "blind_judging": (bool(portal.evaluator_blind_judging) if portal else False),
        "can_comment": (bool(portal.evaluator_can_comment) if portal else True),
        "approval_gates": (bool(portal.committee_approval_gates) if portal else False),
    }

    return {
        "event": {
            "id": str(event.id),
            "name": event.name,
            "type": etype,
            "raw_type": event.event_type,
            "description": event.description,
            "mode": event.event_mode_type or "team",
            "expected_count": event.expected_teams or event.expected_participants,
            "registration_deadline": _iso(event.registration_deadline),
            "start_date": _iso(event.start_date),
            "end_date": _iso(event.end_date),
            "timezone": event.timezone,
            "status": event.config_status,
            "is_submission_open": bool(event.is_submission_open),
        },
        "phases": phases,
        "active_phase_id": str(active_stage.id) if active_stage else None,
        "team_rules": team_rules,
        "evaluation_model": evaluation_model,
        "ui_config": ui_config,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /event/{event_id}/submit — generic, payload-agnostic intake
# ─────────────────────────────────────────────────────────────────────────────
class SubmitRequest(BaseModel):
    entity_id: str               # team name / participant email / roster id
    entity_label: Optional[str] = None
    stage_id: Optional[str] = None
    submission_type: Optional[str] = None
    payload: dict[str, Any] = {}


@router.post("/event/{event_id}/submit")
async def submit(event_id: str, req: SubmitRequest, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)
    etype = normalize_event_type(event.event_type)

    if not (req.entity_id or "").strip():
        raise HTTPException(status_code=422, detail="entity_id (team/participant identity) is required.")

    # Resolve the target stage (explicit, else the active submission phase).
    stages = (
        await db.execute(
            select(Stage).where(Stage.event_id == event.id).order_by(Stage.sequence_order)
        )
    ).scalars().all()

    target_stage: Optional[Stage] = None
    if req.stage_id:
        try:
            sid = uuid.UUID(req.stage_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid stage_id.")
        target_stage = next((s for s in stages if s.id == sid), None)
        if not target_stage:
            raise HTTPException(status_code=404, detail="Stage not found for this event.")
    else:
        target_stage = next(
            (s for s in stages if not s.is_system_phase and s.engine_type == "SUBMISSION"),
            next((s for s in stages if not s.is_system_phase), None),
        )

    # Validate the payload against the metadata-driven field spec.
    spec = _submission_spec(etype, target_stage)
    missing = [
        f["label"] for f in spec["fields"]
        if f.get("required") and not str(req.payload.get(f["key"], "")).strip()
    ]
    if missing:
        raise HTTPException(
            status_code=422,
            detail={"message": "Submission is missing required fields.", "errors": missing},
        )

    # Upsert: one submission per (entity, stage) — re-submitting overwrites.
    existing = None
    if target_stage is not None:
        existing = (
            await db.execute(
                select(DynamicSubmission).where(
                    DynamicSubmission.event_id == event.id,
                    DynamicSubmission.stage_id == target_stage.id,
                    DynamicSubmission.entity_id == req.entity_id.strip(),
                )
            )
        ).scalar_one_or_none()

    if existing:
        existing.payload = req.payload
        existing.entity_label = req.entity_label or existing.entity_label
        existing.submission_type = req.submission_type or spec["submission_type"]
        existing.status = "submitted"
        row = existing
    else:
        row = DynamicSubmission(
            id=uuid.uuid4(),
            event_id=event.id,
            stage_id=target_stage.id if target_stage else None,
            entity_id=req.entity_id.strip(),
            entity_label=req.entity_label or req.entity_id.strip(),
            submission_type=req.submission_type or spec["submission_type"],
            payload=req.payload,
            status="submitted",
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)
    return {
        "id": str(row.id),
        "event_id": str(row.event_id),
        "stage_id": str(row.stage_id) if row.stage_id else None,
        "entity_id": row.entity_id,
        "submission_type": row.submission_type,
        "status": row.status,
        "message": "Submission received.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /event/{event_id}/submissions — feeds the evaluator portal
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/event/{event_id}/submissions")
async def list_submissions(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)

    subs = (
        await db.execute(
            select(DynamicSubmission)
            .where(DynamicSubmission.event_id == event.id)
            .order_by(DynamicSubmission.created_at)
        )
    ).scalars().all()

    evals = (
        await db.execute(
            select(DynamicEvaluation).where(DynamicEvaluation.event_id == event.id)
        )
    ).scalars().all()
    evals_by_sub: dict[str, list] = {}
    for e in evals:
        evals_by_sub.setdefault(str(e.submission_id), []).append(
            {
                "id": str(e.id),
                "evaluator_label": e.evaluator_label,
                "scores": e.scores or {},
                "aggregate_score": float(e.aggregate_score) if e.aggregate_score is not None else None,
                "feedback": e.feedback,
            }
        )

    return [
        {
            "id": str(s.id),
            "stage_id": str(s.stage_id) if s.stage_id else None,
            "entity_id": s.entity_id,
            "entity_label": s.entity_label,
            "submission_type": s.submission_type,
            "payload": s.payload or {},
            "status": s.status,
            "submitted_at": _iso(s.created_at),
            "evaluations": evals_by_sub.get(str(s.id), []),
        }
        for s in subs
    ]


# ─────────────────────────────────────────────────────────────────────────────
# POST /event/{event_id}/evaluate — generic rubric-mapped scoring
# ─────────────────────────────────────────────────────────────────────────────
class EvaluateRequest(BaseModel):
    submission_id: str
    evaluator_label: Optional[str] = None
    scores: dict[str, float] = {}     # {criterion_name: raw_score}
    feedback: Optional[str] = None


def _aggregate(scores: dict[str, float], criteria: list[JudgingCriterion], method: str) -> float:
    """Map raw per-criterion scores to a single aggregate using the event's method."""
    by_name = {c.name: c for c in criteria}
    pairs = [(by_name[name], float(val)) for name, val in scores.items() if name in by_name]
    if not pairs:
        return 0.0

    if method == "average":
        return round(sum(v for _, v in pairs) / len(pairs), 2)
    if method == "trimmed_mean" and len(pairs) >= 3:
        vals = sorted(v for _, v in pairs)
        trimmed = vals[1:-1]
        return round(sum(trimmed) / len(trimmed), 2)

    # weighted_average (default). JudgingCriterion.weight is a 0..1 fraction.
    total_w = sum(float(c.weight or 0) for c, _ in pairs)
    if total_w <= 0:
        return round(sum(v for _, v in pairs) / len(pairs), 2)
    return round(sum(float(c.weight or 0) * v for c, v in pairs) / total_w, 2)


@router.post("/event/{event_id}/evaluate")
async def evaluate(event_id: str, req: EvaluateRequest, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)

    try:
        sub_id = uuid.UUID(req.submission_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid submission_id.")
    submission = (
        await db.execute(
            select(DynamicSubmission).where(
                DynamicSubmission.id == sub_id, DynamicSubmission.event_id == event.id
            )
        )
    ).scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found for this event.")

    criteria = (
        await db.execute(select(JudgingCriterion).where(JudgingCriterion.event_id == event.id))
    ).scalars().all()
    if not criteria:
        raise HTTPException(status_code=400, detail="This event has no rubric to score against.")

    by_name = {c.name: c for c in criteria}
    errors: list[str] = []
    for name, val in (req.scores or {}).items():
        crit = by_name.get(name)
        if not crit:
            errors.append(f"Unknown criterion '{name}'.")
            continue
        try:
            v = float(val)
        except (ValueError, TypeError):
            errors.append(f"Score for '{name}' must be a number.")
            continue
        if v < 0 or v > float(crit.max_score or 10):
            errors.append(f"Score for '{name}' must be between 0 and {float(crit.max_score or 10):g}.")
    if errors:
        raise HTTPException(
            status_code=422, detail={"message": "Evaluation has invalid scores.", "errors": errors}
        )

    scoring = (
        await db.execute(select(EventScoringConfig).where(EventScoringConfig.event_id == event.id))
    ).scalar_one_or_none()
    method = scoring.aggregation_method if scoring else "weighted_average"
    aggregate = _aggregate(req.scores or {}, criteria, method)

    row = DynamicEvaluation(
        id=uuid.uuid4(),
        event_id=event.id,
        submission_id=submission.id,
        evaluator_label=req.evaluator_label or "Evaluator",
        scores=req.scores or {},
        aggregate_score=aggregate,
        feedback=req.feedback,
    )
    db.add(row)
    submission.status = "evaluated"
    await db.commit()

    return {
        "id": str(row.id),
        "submission_id": str(submission.id),
        "aggregate_score": aggregate,
        "method": method,
        "message": "Evaluation recorded.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /event/{event_id}/results — aggregated leaderboard
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/event/{event_id}/results")
async def results(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)

    subs = (
        await db.execute(select(DynamicSubmission).where(DynamicSubmission.event_id == event.id))
    ).scalars().all()
    evals = (
        await db.execute(select(DynamicEvaluation).where(DynamicEvaluation.event_id == event.id))
    ).scalars().all()

    agg_by_sub: dict[str, list[float]] = {}
    for e in evals:
        if e.aggregate_score is not None:
            agg_by_sub.setdefault(str(e.submission_id), []).append(float(e.aggregate_score))

    rows = []
    for s in subs:
        scores = agg_by_sub.get(str(s.id), [])
        final = round(sum(scores) / len(scores), 2) if scores else None
        rows.append(
            {
                "submission_id": str(s.id),
                "entity_id": s.entity_id,
                "entity_label": s.entity_label,
                "judges_scored": len(scores),
                "final_score": final,
                "status": s.status,
            }
        )

    rows.sort(key=lambda r: (r["final_score"] is not None, r["final_score"] or 0), reverse=True)
    for i, r in enumerate(rows, 1):
        r["rank"] = i if r["final_score"] is not None else None

    return {"event_id": str(event.id), "event_name": event.name, "leaderboard": rows}
