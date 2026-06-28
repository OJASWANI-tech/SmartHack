"""
config_agent.py â€” Event-Agnostic Execution Engine: Config Agent

Architecture:
  1. EXTRACTOR LLM  â€” converts raw user text â†’ structured Blueprint JSON
  2. CONVERSATION LLM â€” natural dialog, validates incrementally, asks clarifying Qs
  3. VALIDATOR  â€” blueprint_validator.py checks structural/logical correctness
  4. COMMIT  â€” writes Event + Stages + JudgingCriteria + Blueprint to DB atomically

Blueprint is the ONLY config format. No fixed 17-field form.
Supports any event: hackathon, tournament, quiz, cooking showdown, etc.
"""

from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.event import Event
from app.models.event_draft import EventDraft
from app.models.event_blueprint import EventBlueprint
from app.models.event_scoring_config import EventScoringConfig
from app.models.event_communication_config import EventCommunicationConfig
from app.models.judging_criteria import JudgingCriterion
from app.models.stage import Stage
from app.services.blueprint_validator import validate_blueprint

router = APIRouter(prefix="/api/config-agent", tags=["config-agent"])

def _make_llm():
    try:
        from langchain_groq import ChatGroq
        api_key = os.environ.get("GROQ_API_KEY", "")
        if api_key and api_key != "dummy_key":
            return ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                api_key=api_key,
            )
    except Exception:
        pass

    return None


_llm = _make_llm()


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Prompts
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

BLUEPRINT_SCHEMA = """
{
  "event": {
    "name": "string",
    "type": "string",         // hackathon | tournament | quiz | cooking_showdown | debate | esports | ...anything
    "description": "string",
    "mode": "solo" | "team",
    "entity_constraints": {   // OPTIONAL â€” can be set during CSV intake phase
      "min_size": int | null,
      "max_size": int | null,
      "required_roles": ["string"] | null
    },
    "expected_teams": int | null,         // use for team events (e.g. 16 teams)
    "expected_participants": int | null,  // use for solo events (e.g. 200 participants)
    "registration_deadline": "ISO date | null",
    "timezone": "string | null",

    "registration_config": {
      "allow_walk_in": bool,             // can participants register on the spot?
      "requires_approval": bool,         // does each registration need committee approval?
      "intake_via_csv": bool             // will participants be bulk-uploaded via CSV?
    },

    "participant_portal": {
      "show_leaderboard": bool,          // infer: true for competitions with scoring
      "show_schedule": bool,             // infer: true if phases have dates
      "show_other_teams": bool,          // infer: false for hackathons, true for tournaments
      "allow_team_self_form": bool,      // can participants create/join teams themselves?
      "submission_visible_to_participants": bool
    },

    "evaluator_portal": {
      "role_label": "string",            // "Judge" | "Evaluator" | "Referee" | infer from event type
      "can_see_participant_names": bool, // blind judging?
      "can_leave_comments": bool,
      "receives_assignments_via": "email" | "portal"  // infer: "portal"
    },

    "committee_config": {
      "can_override_scores": bool,
      "approval_gates": bool,            // infer: true if any MATCHUP or ASSESSMENT phase exists
      "announcement_channels": ["email" | "in_app" | "sms"]
    }
  },

  "phases": [
    {
      "id": "phase_{n}_{slug}",
      "name": "string",
      "sequence": int,
      "engine": "SUBMISSION" | "MATCHUP" | "ASSESSMENT" | "AUTOMATED",
      "qualifier_count": int | null,    // how many advance to next phase (infer from context e.g. "top 8 qualify")
      "start_date": "ISO date | null",
      "end_date": "ISO date | null",
      "config": { /* engine-specific â€” see below */ }
    }
  ]
}

ENGINE CONFIG SHAPES:

SUBMISSION:
  {
    "accepts": ["file" | "link" | "text"],
    "max_size_mb": int | null,
    "required_fields": ["string"] | null,   // e.g. ["project_name", "github_link", "demo_video"]
    "submission_window_hours": int | null   // how long is submission open
  }

MATCHUP:
  {
    "format": "single_elimination" | "double_elimination" | "round_robin" | "swiss",
    "seeding": "random" | "ranked" | "manual",
    "third_place_match": bool,
    "teams_count": int | null    // number of teams in this phase (infer from qualifier_count of previous phase)
  }

ASSESSMENT:
  {
    "criteria": [{"name": str, "description": str, "weight": float, "max_score": float}],
    "judges_per_entity": int,
    "total_judges": int | null,
    "score_aggregation": "average" | "weighted_average" | "trimmed_mean",
    "score_range": [float, float],
    "qualitative_feedback": bool,
    "anomaly_threshold_pct": float,
    "judge_assignment": "random" | "expertise" | "manual",
    "blind_judging": bool    // infer from evaluator_portal.can_see_participant_names
  }

AUTOMATED:
  {
    "type": "quiz" | "api_test" | "code_judge",
    "time_limit_minutes": int | null,
    "questions": [...] | null,
    "question_bank_id": str | null,
    "api_endpoint": str | null,
    "pass_score": float | null
  }
"""

EXTRACTOR_SYSTEM = f"""You are a structured data extraction engine for an event configuration system.

You receive:
1. The current Blueprint JSON (may be partially filled or empty {{}}  )
2. The latest user message

Your job: update the Blueprint with any new info inferred from the message.

RULES:
- Return ONLY valid JSON matching this schema â€” no markdown, no explanation.
- Never remove a field that already has a value unless the user explicitly changes it.
- For phases: build structured objects. Choose the best engine type:
    SUBMISSION  â†’ "submit your project", "upload files", "send link", "turn in work"
    MATCHUP     â†’ "bracket", "tournament", "versus", "1v1", "fixtures", "knockout"
    ASSESSMENT  â†’ "judging", "scoring", "rubric", "evaluate", "jury", "panel"
    AUTOMATED   â†’ "quiz", "test", "MCQ", "code challenge", "API test", "online assessment"
- ASSESSMENT criteria weights must sum to 100. Distribute evenly if not specified but do ask for them if not provided.
- If a field cannot be inferred, leave it null or omit it.
- entity_constraints (min_size, max_size) are OPTIONAL â€” do NOT set them unless user explicitly states team size.
- For team events: store team count in expected_teams, NOT expected_participants.
  e.g. "16 teams compete" â†’ expected_teams: 16, expected_participants: null
- Infer portal/config fields aggressively from context:
  - Tournaments â†’ show_leaderboard: true, show_other_teams: true, allow_team_self_form: false
  - Hackathons â†’ allow_team_self_form: true, blind_judging: false
  - Cooking/creative â†’ role_label: "Judge", blind_judging: true
  - Any phase with dates â†’ show_schedule: true
  - Any MATCHUP or ASSESSMENT phase â†’ approval_gates: true, can_override_scores: true
- qualifier_count: if user says "top 8 qualify for next round", set qualifier_count: 8 on the GROUP STAGE phase.
- MATCHUP phases: set teams_count from qualifier_count of the previous phase if not stated.

SCHEMA:
{BLUEPRINT_SCHEMA}
"""

CONVERSATION_SYSTEM = """You are HackSmart's intelligent event configuration assistant.
Your goal: gather everything needed to build a complete event blueprint through natural conversation.

THE 4 EXECUTION ENGINES â€” understand these so you can configure phases correctly:
- SUBMISSION  : collects files, links, or text from participants (e.g. project submissions)
- MATCHUP     : creates brackets/fixtures (e.g. tournament rounds, 1v1s)
- ASSESSMENT  : jury/rubric scoring by judges (e.g. judging panels, evaluation rounds)
- AUTOMATED   : system-run tests (e.g. online quizzes, coding challenges, API tests)

WHAT YOU MUST GATHER (adapt to event type â€” not all apply):
âœ“ Event name, type, description
âœ“ Solo or team event
âœ“ Expected team count (for team events) OR participant count (for solo events)
  â€” Do NOT ask for team size (min/max players per team); that's configured during CSV intake.
âœ“ Each phase: name, engine, dates, engine-specific config
  - SUBMISSION: what to accept (file/link/text), required fields, submission window
  - MATCHUP: bracket format, seeding method, how many teams advance from prior phase
  - ASSESSMENT: scoring criteria + % weights (must sum 100%), judges per team, score scale
  - AUTOMATED: type, time limit, pass score
âœ“ Registration deadline, key dates
âœ“ Portal preferences (only ask if not obvious from context):
  - Should participants see a leaderboard?
  - Should judging be blind (evaluators can't see team names)?
  - How will participants register â€” self-registration or CSV upload by committee?

INFERRABLE â€” do NOT ask about these, just infer:
- Tournaments â†’ leaderboard on, can see other teams, committee approval gates on
- Any phase with dates â†’ schedule visible to participants
- MATCHUP/ASSESSMENT phases â†’ committee approval gates enabled
- Hackathons â†’ teams self-form, leaderboard optional

CONVERSATION RULES:
- Read the full conversation before every reply. Never re-ask what's been answered.
- Extract aggressively â€” infer from context.
- After each message: briefly confirm what you've understood (1 sentence), then ask only what's missing.
- Ask at most 2-3 missing things per reply, as a natural paragraph (not a bullet list).
- If organizer says "16 teams", store that as expected_teams = 16, not participants.
- Be conversational, warm, and efficient. Don't sound like a form.

VALIDATION ERRORS (if any are in {validation_errors}):
Address them conversationally â€” explain in plain language and ask for the missing info.

WHEN COMPLETE â€” output this block immediately (no extra Qs):

---BLUEPRINT_SUMMARY---
[A clean human-readable summary of the entire event blueprint]
---END_BLUEPRINT_SUMMARY---

Then write exactly: "Does this look right? Click **Approve & Create Event** to finalize, or tell me what to change."

CURRENT BLUEPRINT STATE:
{blueprint}

VALIDATION ERRORS (if any):
{validation_errors}
"""


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Pydantic schemas
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class Message(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    blueprint: Optional[dict] = {}
    draft_id: Optional[str] = None
    committee_member_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    is_summary: bool
    is_approved: bool
    blueprint: dict
    validation_errors: list[str]
    draft_id: Optional[str] = None


class CommitRequest(BaseModel):
    draft_id: str
    committee_member_id: Optional[int] = None


class CommitResponse(BaseModel):
    event_id: str
    event_name: str
    phase_count: int
    blueprint_id: str
    message: str


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# LLM helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async def _extract_blueprint_llm(user_text: str, current_blueprint: dict) -> dict:
    """Run the extractor LLM to merge user message into the blueprint."""
    if _llm is None:
        return current_blueprint
    try:
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=EXTRACTOR_SYSTEM),
            HumanMessage(content=(
                f"CURRENT BLUEPRINT:\n{json.dumps(current_blueprint, ensure_ascii=False)}\n\n"
                f"USER MESSAGE:\n{user_text}"
            )),
        ]
        response = await _llm.ainvoke(messages)
        raw = response.content.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        updated = json.loads(raw)

        # Preserve existing non-null values (LLM safety net)
        _deep_preserve(current_blueprint, updated)
        return updated
    except Exception as e:
        print(f"[config_agent] extractor error: {e}")
        return current_blueprint


def _deep_preserve(existing: dict, updated: dict):
    """Recursively preserve existing non-null values that the LLM may have dropped."""
    for k, v in existing.items():
        if v is None or v == {} or v == []:
            continue
        if k not in updated or updated[k] is None:
            updated[k] = v
        elif isinstance(v, dict) and isinstance(updated.get(k), dict):
            _deep_preserve(v, updated[k])


def _build_conversation_messages(req_messages: list[Message], blueprint: dict, validation_errors: list[str]) -> list:
    try:
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        system = (
            CONVERSATION_SYSTEM
            .replace("{blueprint}", json.dumps(blueprint, indent=2) if blueprint else "Empty â€” nothing collected yet.")
            .replace("{validation_errors}", "\n".join(validation_errors) if validation_errors else "None")
        )
        lc = [SystemMessage(content=system)]
        for m in req_messages:
            if m.role == "user":
                lc.append(HumanMessage(content=m.content))
            elif m.role == "assistant":
                lc.append(AIMessage(content=m.content))
        return lc
    except ImportError:
        return []


def _is_approval(text: str) -> bool:
    t = text.strip().lower()
    keywords = {"approve", "approved", "yes", "confirm", "looks good", "correct",
                "looks right", "go ahead", "create it", "finalize", "create event"}
    return t in keywords or any(kw in t for kw in keywords)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# DB helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async def _upsert_draft(
    db: AsyncSession,
    draft_id: Optional[str],
    messages: list[Message],
    blueprint: dict,
    summary_text: Optional[str],
    committee_member_id: Optional[int],
) -> EventDraft:
    msgs_json = [{"role": m.role, "content": m.content} for m in messages]

    if draft_id:
        result = await db.execute(select(EventDraft).where(EventDraft.id == uuid.UUID(draft_id)))
        draft = result.scalar_one_or_none()
        if draft:
            draft.messages = msgs_json
            draft.collected_fields = blueprint  # reuse collected_fields to store blueprint
            if summary_text:
                draft.summary_text = summary_text
                draft.status = "confirmed"
            draft.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(draft)
            return draft

    draft = EventDraft(
        id=uuid.uuid4(),
        created_by=committee_member_id,
        messages=msgs_json,
        collected_fields=blueprint,
        summary_text=summary_text,
        status="confirmed" if summary_text else "draft",
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Commit helpers â€” build DB rows from blueprint
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ENGINE_TO_STAGE_TYPE = {
    "SUBMISSION": "submission",
    "MATCHUP": "team_formation",    # closest legacy type
    "ASSESSMENT": "evaluation",
    "AUTOMATED": "custom",
}

COMM_SCOPE_MAP = {
    "participants": "all_participants",
    "all participants": "all_participants",
    "teams": "active_teams",
    "judges": "evaluators",
    "evaluators": "evaluators",
    "committee": "committee",
}


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%B %d, %Y", "%b %d, %Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(date_str, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _build_event_from_blueprint(bp: dict, committee_member_id: Optional[int]) -> Event:
    ev = bp.get("event", {})
    ec = ev.get("entity_constraints", {})
    mode = ev.get("mode", "team")
    reg = ev.get("registration_config", {})
    participant_portal = ev.get("participant_portal", {})
    evaluator_portal = ev.get("evaluator_portal", {})
    committee_cfg = ev.get("committee_config", {})

    return Event(
        id=uuid.uuid4(),
        name=ev.get("name", "Unnamed Event"),
        event_type=(ev.get("type") or "custom").lower().replace(" ", "_"),
        description=ev.get("description"),
        config_source="conversational",
        config_status="configured",
        event_mode="dynamic",
        current_participant_stage="intake",
        current_committee_stage="intake",
        is_submission_open=False,
        configured_at=datetime.now(timezone.utc),
        created_by=committee_member_id,
        stage_config={
            "blueprint_mode": True,
            "mode": mode,
            "entity_constraints": ec,
            "expected_teams": ev.get("expected_teams"),
            "expected_participants": ev.get("expected_participants"),
            "timezone": ev.get("timezone"),
            "registration_config": reg,
            "participant_portal": participant_portal,
            "evaluator_portal": evaluator_portal,
            "committee_config": committee_cfg,
        },
    )


def _build_stages_from_blueprint(bp: dict, event_id) -> list[Stage]:
    phases = bp.get("phases", [])
    stages = []
    for phase in sorted(phases, key=lambda p: p.get("sequence", 0)):
        engine = phase.get("engine", "ASSESSMENT")
        stages.append(Stage(
            id=uuid.uuid4(),
            event_id=event_id,
            name=phase.get("name", f"Phase {phase.get('sequence', 0)}"),
            description=phase.get("description", ""),
            sequence_order=phase.get("sequence", 0),
            engine_type=engine,
            stage_type=ENGINE_TO_STAGE_TYPE.get(engine, "custom"),
            engine_config=phase.get("config", {}),
            config={"phase_id": phase.get("id"), "source": "blueprint"},
            status="upcoming",
            is_committee_visible=True,
            approval_required=engine in ("MATCHUP", "ASSESSMENT"),
            start_date=_parse_date(phase.get("start_date")),
            submission_deadline=_parse_date(phase.get("end_date")),
        ))
    return stages


def _build_criteria_from_blueprint(bp: dict, event_id, stages: list[Stage]) -> list[JudgingCriterion]:
    criteria_rows = []
    for phase in bp.get("phases", []):
        if phase.get("engine") != "ASSESSMENT":
            continue
        cfg = phase.get("config", {})
        raw_criteria = cfg.get("criteria", [])
        score_range = cfg.get("score_range", [0, 10])
        max_score = float(score_range[1]) if len(score_range) > 1 else 10.0

        # Find matching stage
        linked_stage = next(
            (s for s in stages if s.name.lower() == phase.get("name", "").lower()), None
        )

        for i, crit in enumerate(raw_criteria):
            if not isinstance(crit, dict):
                continue
            weight_pct = float(crit.get("weight", crit.get("weight_pct", 0)) or 0)
            criteria_rows.append(JudgingCriterion(
                id=uuid.uuid4(),
                event_id=event_id,
                stage_id=linked_stage.id if linked_stage else None,
                name=crit.get("name", f"Criterion {i+1}"),
                description=crit.get("description", ""),
                weight=weight_pct / 100.0,
                max_score=max_score,
                sort_order=i,
            ))
    return criteria_rows


def _build_scoring_config(bp: dict, event_id) -> Optional[EventScoringConfig]:
    """Build from the first ASSESSMENT phase found."""
    for phase in bp.get("phases", []):
        if phase.get("engine") != "ASSESSMENT":
            continue
        cfg = phase.get("config", {})
        score_range = cfg.get("score_range", [0, 10])
        agg_map = {
            "average": "average",
            "weighted_average": "weighted_average",
            "trimmed_mean": "trimmed_mean",
        }
        agg_raw = str(cfg.get("score_aggregation") or "weighted_average").lower()
        agg = agg_map.get(agg_raw, "weighted_average")

        jsel_raw = str(cfg.get("judge_assignment") or "expertise").lower()
        jsel_map = {"random": "random", "expertise": "expertise_based", "manual": "manual"}
        jsel = jsel_map.get(jsel_raw, "expertise_based")

        return EventScoringConfig(
            id=uuid.uuid4(),
            event_id=event_id,
            score_scale_min=float(score_range[0]) if score_range else 0,
            score_scale_max=float(score_range[1]) if len(score_range) > 1 else 10,
            aggregation_method=agg,
            anomaly_threshold_pct=float(cfg.get("anomaly_threshold_pct") or 20.0),
            judges_per_team=int(cfg.get("judges_per_entity") or 2),
            total_judges=int(cfg["total_judges"]) if cfg.get("total_judges") else None,
            mentor_count=0,
            judge_selection=jsel,
            judge_overlap="single_stage",
            qualitative_feedback=bool(cfg.get("qualitative_feedback", True)),
        )
    return None


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Routes
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/init", response_model=ChatResponse)
async def init_chat(db: AsyncSession = Depends(get_db)):
    """Return the agent's opening greeting."""
    greeting = (
        "Hi! I'm HackSmart's configuration assistant. I can set up any kind of event â€” "
        "a hackathon, sports tournament, cooking showdown, quiz competition, debate, esports bracket, "
        "case competition â€” anything. Just describe the event you have in mind and I'll ask "
        "whatever I need to configure it completely. What are you running?"
    )
    if _llm:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            lc = _build_conversation_messages(
                [Message(role="user", content="Hello, I want to configure a new event.")],
                {}, []
            )
            response = await _llm.ainvoke(lc)
            greeting = response.content
        except Exception as e:
            print(f"[config_agent] init error: {e}")

    return ChatResponse(
        reply=greeting, is_summary=False, is_approved=False,
        blueprint={}, validation_errors=[], draft_id=None,
    )


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    last_user = next((m.content for m in reversed(req.messages) if m.role == "user"), "")

    # 1. Extract/update blueprint from user message
    updated_blueprint = await _extract_blueprint_llm(last_user, req.blueprint or {})

    # 2. Validate the blueprint
    validation_errors = validate_blueprint(updated_blueprint) if updated_blueprint else []

    # 3. Check for approval intent
    is_approved = _is_approval(last_user)

    # 4. Get conversational reply
    reply = ""
    is_summary = False
    summary_text = None
    try:
        if _llm:
            lc = _build_conversation_messages(req.messages, updated_blueprint, validation_errors)
            response = await _llm.ainvoke(lc)
            reply = response.content
        else:
            reply = (
                "I'm running in offline mode â€” no LLM API key configured. "
                "Set ANTHROPIC_API_KEY or GROQ_API_KEY to enable the agent."
            )

        is_summary = "---BLUEPRINT_SUMMARY---" in reply and "---END_BLUEPRINT_SUMMARY---" in reply
        if is_summary:
            start = reply.index("---BLUEPRINT_SUMMARY---") + len("---BLUEPRINT_SUMMARY---")
            end = reply.index("---END_BLUEPRINT_SUMMARY---")
            summary_text = reply[start:end].strip()

    except Exception as e:
        import traceback
        traceback.print_exc()
        reply = "I ran into an issue processing that. Please try again."

    # 5. Persist draft
    draft = await _upsert_draft(
        db,
        draft_id=req.draft_id,
        messages=req.messages + [Message(role="assistant", content=reply)],
        blueprint=updated_blueprint,
        summary_text=summary_text,
        committee_member_id=req.committee_member_id,
    )

    return ChatResponse(
        reply=reply,
        is_summary=is_summary,
        is_approved=is_approved,
        blueprint=updated_blueprint,
        validation_errors=validation_errors,
        draft_id=str(draft.id),
    )


@router.post("/commit", response_model=CommitResponse)
async def commit_event(req: CommitRequest, db: AsyncSession = Depends(get_db)):
    """
    Atomically create all DB rows from an approved EventDraft blueprint.
    Creates: Event, Stage[], JudgingCriterion[], EventScoringConfig, EventBlueprint
    """
    result = await db.execute(select(EventDraft).where(EventDraft.id == uuid.UUID(req.draft_id)))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status == "committed":
        raise HTTPException(status_code=400, detail="Draft already committed")

    # Blueprint is stored in collected_fields
    bp = draft.collected_fields or {}

    # Final validation before commit
    errors = validate_blueprint(bp)
    if errors:
        raise HTTPException(
            status_code=422,
            detail={"message": "Blueprint has validation errors", "errors": errors},
        )

    # â”€â”€ 1. Event â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    event = _build_event_from_blueprint(bp, req.committee_member_id)
    db.add(event)
    await db.flush()

    # â”€â”€ 2. Stages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    stages = _build_stages_from_blueprint(bp, event.id)
    for s in stages:
        db.add(s)
    await db.flush()

    # â”€â”€ 3. Judging Criteria â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    criteria = _build_criteria_from_blueprint(bp, event.id, stages)
    for c in criteria:
        db.add(c)

    # â”€â”€ 4. Scoring Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    scoring = _build_scoring_config(bp, event.id)
    if scoring:
        db.add(scoring)

    # â”€â”€ 5. EventBlueprint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    blueprint_row = EventBlueprint(
        id=uuid.uuid4(),
        event_id=event.id,
        draft_id=draft.id,
        blueprint=bp,
        status="active",
        version=1,
    )
    db.add(blueprint_row)

    # â”€â”€ 6. Mark draft committed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    draft.event_id = event.id
    draft.status = "committed"
    draft.approved_at = datetime.now(timezone.utc)

    await db.commit()

    return CommitResponse(
        event_id=str(event.id),
        event_name=event.name,
        phase_count=len(stages),
        blueprint_id=str(blueprint_row.id),
        message=f"'{event.name}' created with {len(stages)} phases.",
    )


@router.get("/draft/{draft_id}")
async def get_draft(draft_id: str, db: AsyncSession = Depends(get_db)):
    """Resume a saved draft (after browser close / session restore)."""
    result = await db.execute(select(EventDraft).where(EventDraft.id == uuid.UUID(draft_id)))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    bp = draft.collected_fields or {}
    return {
        "draft_id": str(draft.id),
        "messages": draft.messages,
        "blueprint": bp,
        "validation_errors": validate_blueprint(bp) if bp else [],
        "summary_text": draft.summary_text,
        "status": draft.status,
        "event_id": str(draft.event_id) if draft.event_id else None,
    }


@router.post("/validate")
async def validate_draft(blueprint: dict):
    """Validate a blueprint without saving. Useful for frontend real-time checks."""
    errors = validate_blueprint(blueprint)
    return {"valid": len(errors) == 0, "errors": errors}
