"""
config_agent.py â€” Universal AI Event Architect

Architecture:
  1. EXTRACTOR LLM    â€” converts raw user text -> Universal Event Model JSON
  2. DEFAULTS ENGINE   â€” fills in optional fields per event_type, records what it filled
  3. STAGE TEMPLATES   â€” deterministic per-event-type workflow (Registration -> ... -> Results)
  4. CONVERSATION LLM  â€” natural dialog, asks only for missing CRITICAL fields
  5. VALIDATOR         â€” blueprint_validator.py checks model + generated stage pipeline
  6. COMMIT            â€” writes Event + Stages + JudgingCriteria + config tables atomically

Universal Event Model is the ONLY config format. Supports any event type: coding contests,
hackathons, case competitions, MUNs, debates, sports tournaments, workshops, conferences,
cultural/technical festivals, startup competitions, research symposiums, or any future
custom event.

CRITICAL RULE: activities / tracks / committees / competition_categories are content
groupings, never workflow stages. A sports tournament with cricket/football/badminton
gets the SAME 7-stage sports workflow regardless of how many sports are named â€” the
sports themselves are just data attached to the relevant stage's engine_config.
"""

from __future__ import annotations

import json
import os
import re
import uuid
import base64
import io
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
from app.models.event_team_formation_config import EventTeamFormationConfig
from app.models.event_portal_config import EventPortalConfig
from app.models.event_budget import EventBudget
from app.models.event_committee_role import EventCommitteeRole
from app.models.event_resource_requirement import EventResourceRequirement
from app.models.judging_criteria import JudgingCriterion
from app.models.stage import Stage
from app.services.blueprint_validator import validate_universal_model, validate_stage_pipeline

router = APIRouter(prefix="/api/config-agent", tags=["config-agent"])


def _make_llm():
    try:
        from langchain_groq import ChatGroq
        api_key = os.environ.get("GROQ_API_KEY", "")
        if api_key and api_key != "dummy_key":
            return ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0.0,
                api_key=api_key,
            )
    except Exception:
        pass

    return None


_llm = _make_llm()


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Universal Event Model â€” schema, type normalization
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

UNIVERSAL_EVENT_SCHEMA = """
{
  "event_name": "string",
  "event_type": "coding_contest | hackathon | case_competition | mun | debate |
                  sports_tournament | workshop | conference | cultural_festival |
                  technical_festival | startup_competition | research_symposium | custom",
  "description": "string",
  "mode": "solo" | "team",

  "activities": ["string"],              // sports/games/contests run in parallel. SPORTS ONLY. NEVER stages.
  "tracks": ["string"],                  // hackathon/startup tracks, e.g. "AI Track". NEVER stages.
  "committees": ["string"],              // MUN-style committees, e.g. "UNGA", "WHO". NEVER stages.
  "competition_categories": ["string"],  // case-comp categories, e.g. "Marketing", "Finance". NEVER stages.

  "participants": {
    "expected_count": int | null,        // team count for team mode, individual count for solo mode
    "team_size_min": int | null,
    "team_size_max": int | null,
    "team_formation_factors": ["string"] // e.g. ["skill_level", "domain_preference", "institute"]
  },

  "resources": {
    "budget": {
      "total": float | null,             // parse out of currency text, e.g. "â‚¹8,00,000" -> 800000
      "currency": "string",              // infer: â‚¹/rupees -> INR, $/dollars -> USD, â‚¬/euros -> EUR
      "sponsorship_target": float | null,
      "track_expenses": bool,
      "track_sponsorship": bool
    } | null,
    "requirements": [
      {
        "category": "staffing" | "venue" | "equipment" | "medical",
        "label": "string",               // e.g. "Referees", "Football Ground", "Medical Team"
        "quantity": int | null,
        "for_stage": "string | null",    // name of the specific workflow stage this need belongs to, or null
        "notes": "string | null"
      }
    ]
  },

  "roles": ["string"],          // named committee/staff roles, e.g. "Event Director", "Sponsorship Team", "Mentor"
  "deliverables": ["string"],   // e.g. "Pitch Deck", "Resolution Paper", "Working Prototype"

  "timeline": {
    "start_date": "ISO date | null",
    "end_date": "ISO date | null",
    "registration_deadline": "ISO date | null",
    "timezone": "string | null"
  },

  "constraints": ["string"],    // free-text constraints, e.g. "max 5 teams per institute"

  "judging": {
    "criteria": [{"name": str, "description": str, "weight": float, "max_score": float}],
    "judges_per_entity": int | null,
    "score_range": [float, float],
    "aggregation": "average" | "weighted_average" | "trimmed_mean",
    "blind_judging": bool,
    "judge_role_label": "string"   // "Judge" | "Referee" | "Evaluator" â€” infer from event type
  },

  "special_requirements": ["string"],  // free text, e.g. "needs livestream", "anti-cheat plugin"

  "custom_workflow_stages": [
    {"name": "string", "engine_hint": "SUBMISSION | MATCHUP | ASSESSMENT | AUTOMATED", "gate_after": bool}
  ] | null   // the organizer's own complete ordered stage plan, ONLY when they explicitly
             // describe their own stage-by-stage workflow. Otherwise leave null/empty.

  // "feature_flags" is NOT extracted by the LLM â€” apply_defaults() fills it in below,
  // e.g. {"anti_cheat_enabled": true, "leaderboard_enabled": true}.
}
"""

EVENT_TYPE_ALIASES = {
    "coding contest": "coding_contest", "programming contest": "coding_contest",
    "code contest": "coding_contest", "algorithm contest": "coding_contest",
    "coding competition": "coding_contest",
    "hackathon": "hackathon",
    "case competition": "case_competition", "case comp": "case_competition",
    "business case competition": "case_competition",
    "mun": "mun", "model un": "mun", "model united nations": "mun",
    "debate": "debate", "debating": "debate",
    "sports tournament": "sports_tournament", "sports fest": "sports_tournament",
    "sports festival": "sports_tournament", "tournament": "sports_tournament",
    "workshop": "workshop",
    "conference": "conference",
    "cultural festival": "cultural_festival", "cultural fest": "cultural_festival",
    "technical festival": "technical_festival", "technical fest": "technical_festival",
    "tech fest": "technical_festival",
    "startup competition": "startup_competition", "startup comp": "startup_competition",
    "pitch competition": "startup_competition",
    "research symposium": "research_symposium", "symposium": "research_symposium",
}

KNOWN_EVENT_TYPES = {
    "coding_contest", "hackathon", "case_competition", "mun", "debate",
    "sports_tournament", "workshop", "conference", "cultural_festival",
    "technical_festival", "startup_competition", "research_symposium", "custom",
}


def normalize_event_type(raw: Optional[str]) -> str:
    if not raw:
        return "custom"
    key = re.sub(r"[\s_-]+", " ", str(raw).strip().lower())
    if key in EVENT_TYPE_ALIASES:
        return EVENT_TYPE_ALIASES[key]
    snake = key.replace(" ", "_")
    if snake in KNOWN_EVENT_TYPES:
        return snake
    return "custom"


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Prompts
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

EXTRACTOR_SYSTEM = f"""You are a structured data extraction engine for a universal event
configuration system. You receive (1) the current Event Model JSON, possibly partially
filled or empty {{}}, and (2) the latest user message. Update the model with anything new
inferable from the message.

CRITICAL RULE â€” READ THIS FIRST:
Never put a named activity, track, committee, or competition category into a "stage" or
"phase" concept â€” THIS SYSTEM HAS NO PER-ITEM STAGES. Workflow stages (Registration, Judging,
Results, etc.) are generated separately, automatically, from event_type alone. Your only job
for named items is to sort each one into exactly ONE of these flat lists:
  - "activities"             -> sports, games, individual contests run in parallel
                                 (e.g. "cricket, football and badminton" -> 3 activities)
  - "tracks"                 -> hackathon/startup thematic tracks (e.g. "AI Track", "FinTech Track")
  - "committees"              -> MUN-style committees (e.g. "UNGA", "WHO", "UNSC")
  - "competition_categories" -> case-competition categories (e.g. "Marketing", "Finance", "Strategy")
Use event_type to decide which list applies. Never invent a stage per item. Never drop an
item: if the user names 5 sports, all 5 must appear in "activities" â€” never merge or summarize.

CUSTOM WORKFLOW STAGES â€” only when the user explicitly lays out their OWN stage-by-stage
plan (numbered stages, or a clearly named phase breakdown):
- Extract the user's COMPLETE intended ordered workflow into custom_workflow_stages â€”
  not just the stages they named, but the full pipeline a committee would run, by mixing:
  (a) standard building blocks, included only when relevant to what's described:
        Participant Intake          (SUBMISSION) â€” importing the roster/teams
        Registration                 (SUBMISSION) â€” only if intake alone isn't already covering signup
        Team Formation               (AUTOMATED)  â€” only if teams must be algorithmically grouped
        Team Approval                (ASSESSMENT, gate_after=true) â€” committee sign-off on teams/rosters
        Referee/Official Assignment (SUBMISSION) â€” only if referees/judges/officials are mentioned
        Scoring                      (ASSESSMENT) â€” live or per-match scoring
        Standings                    (AUTOMATED)  â€” automatic leaderboard/table calculation
  (b) the user's own named stages verbatim, in the order given (e.g. "Quarter Finals",
      "Semi Finals", "Final Match", "Prize Distribution") â€” these represent actual rounds
      or ceremonies; use engine_hint MATCHUP for head-to-head rounds, SUBMISSION for
      ceremonies/results.
  Skip any building block the user's description doesn't need (e.g. don't add a separate
  "Registration" stage if "Participant Intake" already covers signup; don't add "Referee
  Assignment" if no officials are mentioned).
- Order matters â€” preserve the sequence the user implies or states.
- Mark gate_after=true on at least one stage representing a final decision point (e.g.
  Team Approval, Final Match, Prize Distribution, Results).
- If the user does NOT explicitly describe their own stage breakdown, leave
  custom_workflow_stages null/empty â€” a deterministic per-event-type default is used instead.
- Never duplicate an activities/tracks/committees/competition_categories item as a stage name.

OTHER RULES:
- Return ONLY valid JSON matching the schema below â€” no markdown, no explanation.
- Never remove a field that already has a value unless the user explicitly changes it.
- event_type: pick the closest match from coding_contest | hackathon | case_competition | mun |
  debate | sports_tournament | workshop | conference | cultural_festival | technical_festival |
  startup_competition | research_symposium. If genuinely none fit, use "custom".
- For team events: participants.expected_count holds the TEAM count (e.g. "16 teams" -> 16).
  For solo events: participants.expected_count holds the INDIVIDUAL count (e.g. "200 students" -> 200).
- participants.team_formation_factors: always suggest relevant factors for the event type even
  if the user doesn't mention them (e.g. hackathon -> skill_level, domain_preference, institute;
  sports -> skill_level, availability). Include any factor the user explicitly names too.
- judging: only populate if the event type has a judging/scoring component (hackathon, case
  competition, startup competition, debate, research symposium, cultural/technical festival
  competitions). criteria weights must sum to 100 â€” distribute evenly if unspecified, but the
  conversation agent should still confirm them with the user.
- judge_role_label: cooking/creative/business judging -> "Judge"; sports -> "Referee"; generic -> "Evaluator".
- resources: only populate fields the user actually mentioned (budget, staffing, venues,
  equipment, medical/emergency support). Leave the whole block absent otherwise.
  - resources.budget.total: parse the number out of currency text, e.g. "â‚¹8,00,000" -> 800000.
  - resources.requirements: one entry per distinct staffing/venue/equipment/medical need.
- roles: list every named department/role verbatim (e.g. "Event Director", "Sponsorship Team").
- deliverables: list anything the participants must produce/submit (e.g. "Pitch Deck",
  "Resolution Paper", "Working Prototype") if mentioned.
- timeline.start_date / end_date: the overall event window. registration_deadline is separate.
- special_requirements: anything unusual the user mentions that doesn't fit elsewhere
  (e.g. "needs a livestream", "must support offline check-in").
- If a field cannot be inferred, leave it null or omit it.

SCHEMA:
{UNIVERSAL_EVENT_SCHEMA}
"""

CONVERSATION_SYSTEM = """You are HackSmart's AI Event Architect â€” you can configure ANY kind of
event: coding contests, hackathons, case competitions, MUNs, debates, sports tournaments,
workshops, conferences, cultural/technical festivals, startup competitions, research
symposiums, or anything else an organizer describes.

YOUR PROCESS, every turn:
1. Understand what the organizer just told you.
2. Figure out (or confirm) the event_type.
3. Sort anything they named into activities / tracks / committees / competition_categories â€”
   correctly, per event_type (sports -> activities, hackathon -> tracks, MUN -> committees,
   case competition -> competition_categories). NEVER treat a named item as a workflow stage.
4. Identify what's still CRITICALLY missing (see below) vs. what can be defaulted.
5. Ask exactly ONE focused question about the single most critical missing piece. Never ask
   more than one question in a single reply â€” wait for the answer before asking the next.
6. Everything else gets a sensible default automatically (you'll see {defaults_applied} once
   the model has enough to default from) â€” mention defaults briefly, don't ask permission for them.

CRITICAL FIELDS TO GATHER (ask if missing):
âœ“ Event name, event type, one-line description
âœ“ Solo or team event
âœ“ Expected count: team count (team mode) or participant count (solo mode)
âœ“ For team events: team size range (min/max) if not obviously implied by event type defaults
âœ“ The relevant content list for this event type (activities/tracks/committees/categories) â€”
  confirm you got everyone named, e.g. "Got it â€” football, basketball, badminton, table tennis,
  chess, and athletics" so nothing looks dropped.
âœ“ If the event type has judging (hackathon, case competition, startup competition, debate,
  research symposium, competitive festival): judging criteria + weights (must sum to 100%) â€”
  ask only if not already inferable from a generic event-type default.

EVERYTHING ELSE IS OPTIONAL â€” do not ask unprompted:
- Resources (budget, staffing, venue, equipment, medical) â€” only confirm if the user already
  brought it up.
- Mentors, blind judging, announcement channels, committee approval gates â€” these get sensible
  defaults per event type; mention them, don't interrogate the user about them.

CONVERSATION RULES:
- Read the full conversation before every reply. Never re-ask what's been answered.
- Be conversational, warm, and efficient. Don't sound like a form.
- Extract aggressively â€” infer from context rather than asking.

VALIDATION ERRORS â€” HIGHEST PRIORITY:
If {validation_errors} is non-empty, your ENTIRE reply must be about resolving them. Restate
each error in one plain-language sentence (no raw field names) and ask exactly what's needed.
Only once {validation_errors} is empty should you move on to anything still missing.

WHEN COMPLETE â€” output this block immediately (no extra questions):

---BLUEPRINT_SUMMARY---
## {Event Name}
**Type:** {event_type} | **Mode:** {solo/team} | **Expected:** {count} | **Timezone:** {tz}
**Description:** {description}
**Event Dates:** {start_date} â€“ {end_date} (or TBD) | **Registration Deadline:** {date or TBD}

---

### Activities / Tracks / Committees / Categories
List whichever of these is non-empty for this event_type, one bullet each. If none apply, omit
this section.

### Workflow Stages
List every stage in {stage_preview}, in sequence order, one line each:
`[SEQ]. [Stage Name]` â€” [Engine type] â€” [Audience]  {show ðŸ”’ if approval_required}

### Participants & Team Formation
Expected count, team size range (if team mode), matching factors.

### Judging (only if {judging} is populated)
Criteria with weights, judges per entity, score range, blind judging yes/no.

### Resources & Roles (only if non-empty)
Budget, committee roles, resource requirements.

### Deliverables / Constraints / Special Requirements (only if non-empty)
Bullet list.

### Defaults Applied
List everything in {defaults_applied} as "field -> value (default for {event_type})".
---END_BLUEPRINT_SUMMARY---

Then write exactly: "Does this look right? Click **Approve & Create Event** to finalize, tell me
what to change, or click **Regenerate** to rebuild the workflow and defaults."

CURRENT EVENT MODEL:
{blueprint}

GENERATED WORKFLOW STAGES (for this event_type, already deterministic â€” do not invent your own):
{stage_preview}

DEFAULTS APPLIED SO FAR:
{defaults_applied}

VALIDATION ERRORS (if any):
{validation_errors}
"""


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Pydantic schemas
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class Message(BaseModel):
    role: str   # "user" | "assistant"
    content: str
    file_type: Optional[str] = None  # "pdf" | "voice" | None
    file_content: Optional[str] = None  # base64 encoded file content


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
    entities: dict
    stage_preview: list[dict]
    defaults_applied: dict
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


class RegenerateRequest(BaseModel):
    draft_id: str


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Stage templates â€” deterministic per-event-type workflow.
# Activities/tracks/committees/categories are NEVER turned into stages here;
# they're injected as data into the relevant stage's engine_config instead.
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class StageSpec(dict):
    """Plain dict subclass for readability: {key, name, engine, audience,
    gate_after, content_field, source}."""


def _stage(key: str, name: str, engine: str, audience: str = "committee",
           gate_after: bool = False, content_field: Optional[str] = None) -> dict:
    return {
        "key": key, "name": name, "engine": engine, "audience": audience,
        "gate_after": gate_after, "content_field": content_field,
    }


def _unique_slug(name: str, used: set[str]) -> str:
    """Slugifies a free-text stage name into a unique stage key, deduping collisions."""
    base = re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_") or "stage"
    slug, i = base, 2
    while slug in used:
        slug = f"{base}_{i}"
        i += 1
    used.add(slug)
    return slug


# Each template is an ordered list of stage specs for the ORGANISER portion of the
# pipeline (system stages â€” Participant Intake / Team Formation / Team Approval â€”
# are prepended separately in build_stage_pipeline). `content_field`, if set, means
# that stage's engine_config gets the named top-level list (activities/tracks/
# committees/competition_categories) injected â€” the list itself never becomes stages.
STAGE_TEMPLATES: dict[str, list[dict]] = {
    "coding_contest": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("problem_statements", "Problem Statements", "SUBMISSION"),
        _stage("submission_portal", "Submission Portal", "SUBMISSION", audience="both"),
        _stage("anti_cheat", "Anti-Cheat", "AUTOMATED"),
        _stage("leaderboard", "Leaderboard", "AUTOMATED", audience="both"),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
        _stage("analytics", "Analytics", "AUTOMATED"),
    ],
    "hackathon": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("team_formation", "Team Formation", "AUTOMATED", content_field="tracks"),
        _stage("submission", "Submission", "SUBMISSION", audience="both"),
        _stage("mentor_review", "Mentor Review", "ASSESSMENT"),
        _stage("checkpoint_review", "Checkpoint Review", "ASSESSMENT"),
        _stage("judging", "Judging", "ASSESSMENT", gate_after=True),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "case_competition": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("team_formation", "Team Formation", "AUTOMATED", content_field="competition_categories"),
        _stage("case_release", "Case Release", "SUBMISSION"),
        _stage("submission", "Submission", "SUBMISSION", audience="both"),
        _stage("evaluation", "Evaluation", "ASSESSMENT", gate_after=True),
        _stage("presentation", "Presentation", "ASSESSMENT", audience="both", gate_after=True),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "mun": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("delegate_registration", "Delegate Registration", "SUBMISSION"),
        _stage("committee_allocation", "Committee Allocation", "AUTOMATED", content_field="committees"),
        _stage("session_management", "Session Management", "SUBMISSION", audience="both"),
        _stage("resolution_submission", "Resolution Submission", "SUBMISSION", audience="both"),
        _stage("voting", "Voting", "AUTOMATED", audience="both", gate_after=True),
        _stage("awards", "Awards", "SUBMISSION", audience="both", gate_after=True),
    ],
    "sports_tournament": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("fixture_generation", "Fixture Generation", "MATCHUP", content_field="activities"),
        _stage("match_management", "Match Management", "MATCHUP", audience="both", gate_after=True),
        _stage("scoring", "Scoring", "ASSESSMENT", gate_after=True),
        _stage("standings", "Standings", "AUTOMATED", audience="both"),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "debate": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("motion_release", "Motion Release", "SUBMISSION"),
        _stage("round_allocation", "Round Allocation", "AUTOMATED"),
        _stage("judging", "Judging", "ASSESSMENT", gate_after=True),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "workshop": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("session_scheduling", "Session Scheduling", "AUTOMATED", content_field="tracks"),
        _stage("materials_distribution", "Materials Distribution", "SUBMISSION", audience="both"),
        _stage("attendance_tracking", "Attendance Tracking", "AUTOMATED", audience="both"),
        _stage("feedback_collection", "Feedback Collection", "SUBMISSION", audience="both"),
        _stage("completion", "Completion", "SUBMISSION", audience="both", gate_after=True),
    ],
    "conference": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("speaker_session_management", "Speaker & Session Management", "SUBMISSION", content_field="tracks"),
        _stage("track_scheduling", "Track Scheduling", "AUTOMATED", content_field="tracks"),
        _stage("attendance", "Attendance", "AUTOMATED", audience="both"),
        _stage("feedback_collection", "Feedback Collection", "SUBMISSION", audience="both"),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "cultural_festival": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("activity_scheduling", "Activity Scheduling", "AUTOMATED", content_field="activities"),
        _stage("participation_tracking", "Participation Tracking", "AUTOMATED", audience="both"),
        _stage("judging", "Judging", "ASSESSMENT", gate_after=True),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "technical_festival": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("track_scheduling", "Track/Activity Scheduling", "AUTOMATED", content_field="tracks"),
        _stage("submission", "Submission", "SUBMISSION", audience="both"),
        _stage("judging", "Judging", "ASSESSMENT", gate_after=True),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "startup_competition": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("pitch_submission", "Pitch Submission", "SUBMISSION", audience="both", content_field="tracks"),
        _stage("mentor_review", "Mentor Review", "ASSESSMENT"),
        _stage("judging", "Judging", "ASSESSMENT", gate_after=True),
        _stage("demo_day", "Demo Day", "SUBMISSION", audience="both", gate_after=True),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "research_symposium": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("abstract_submission", "Abstract Submission", "SUBMISSION", audience="both"),
        _stage("review", "Review", "ASSESSMENT", gate_after=True),
        _stage("presentation_scheduling", "Presentation Scheduling", "AUTOMATED"),
        _stage("judging", "Judging", "ASSESSMENT", gate_after=True),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
    "custom": [
        _stage("dashboard", "Dashboard", "SUBMISSION", audience="both"),
        _stage("registration", "Registration", "SUBMISSION"),
        _stage("submission", "Submission", "SUBMISSION", audience="both"),
        _stage("evaluation", "Evaluation", "ASSESSMENT", gate_after=True),
        _stage("results", "Results", "SUBMISSION", audience="both", gate_after=True),
    ],
}


def required_stage_names(event_type: str) -> list[str]:
    return [s["name"] for s in STAGE_TEMPLATES.get(event_type, STAGE_TEMPLATES["custom"])]


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Defaults engine
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DEFAULTS_BY_TYPE: dict[str, dict] = {
    "coding_contest": {
        "feature_flags.anti_cheat_enabled": True,
        "feature_flags.leaderboard_enabled": True,
        "participants.team_size_max": 1,
        "judging.judge_role_label": "Evaluator",
    },
    "hackathon": {
        "feature_flags.mentor_review_enabled": True,
        "feature_flags.checkpoint_review_enabled": True,
        "participants.team_size_min": 2,
        "participants.team_size_max": 4,
        "judging.judge_role_label": "Judge",
    },
    "case_competition": {
        "participants.team_size_min": 2,
        "participants.team_size_max": 3,
        "feature_flags.presentation_round_enabled": True,
        "judging.judge_role_label": "Judge",
    },
    "mun": {
        "feature_flags.moderated_caucus_enabled": True,
        "feature_flags.resolution_workflow_enabled": True,
        "participants.team_size_max": 1,
    },
    "sports_tournament": {
        "feature_flags.registration_stage_enabled": True,
        "feature_flags.fixture_generation_enabled": True,
        "feature_flags.standings_enabled": True,
        "judging.judge_role_label": "Referee",
    },
    "debate": {
        "feature_flags.rounds_default": 3,
        "feature_flags.judges_per_round_default": 3,
        "judging.judge_role_label": "Judge",
        "participants.team_size_min": 1,
        "participants.team_size_max": 2,
    },
    "workshop": {
        "feature_flags.attendance_tracking_enabled": True,
        "participants.team_size_max": 1,
    },
    "conference": {
        "feature_flags.attendance_tracking_enabled": True,
        "participants.team_size_max": 1,
    },
    "cultural_festival": {
        "feature_flags.participation_tracking_enabled": True,
        "judging.judge_role_label": "Judge",
    },
    "technical_festival": {
        "feature_flags.participation_tracking_enabled": True,
        "judging.judge_role_label": "Judge",
    },
    "startup_competition": {
        "feature_flags.mentor_review_enabled": True,
        "participants.team_size_min": 1,
        "participants.team_size_max": 4,
        "judging.judge_role_label": "Judge",
    },
    "research_symposium": {
        "feature_flags.peer_review_enabled": True,
        "participants.team_size_max": 1,
        "judging.judge_role_label": "Reviewer",
    },
    "custom": {},
}


def _get_path(model: dict, path: str):
    node = model
    for part in path.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def _set_path(model: dict, path: str, value) -> None:
    parts = path.split(".")
    node = model
    for part in parts[:-1]:
        nxt = node.get(part)
        if not isinstance(nxt, dict):
            nxt = {}
            node[part] = nxt
        node = nxt
    node[parts[-1]] = value

def apply_defaults(model: dict) -> tuple[dict, dict]:
    """Fills in missing optional fields from DEFAULTS_BY_TYPE[event_type].
    Returns (updated_model, defaults_applied) â€” defaults_applied records exactly
    which fields were filled and with what value, for the review summary."""
    event_type = normalize_event_type(model.get("event_type"))
    model["event_type"] = event_type
    defaults_applied: dict = {}

    # ðŸ¢ 1. Ensure 'participants' exists and handle 'expected_count' default fallback
    participants = model.get("participants")
    if not isinstance(participants, dict):
        participants = {}
        model["participants"] = participants

    # If the user/AI didn't provide an expected count, default it safely (e.g., to 100 or 50)
    if participants.get("expected_count") in (None, "", 0):
        participants["expected_count"] = 100  # <--- Change this to any fallback number you prefer
        defaults_applied["participants.expected_count"] = 100

    # ðŸ”„ 2. Dynamic schema traversal for paths in DEFAULTS_BY_TYPE
    for path, value in DEFAULTS_BY_TYPE.get(event_type, {}).items():
        existing = _get_path(model, path)
        if existing in (None, "", [], {}):
            _set_path(model, path, value)
            defaults_applied[path] = value

    # âš–ï¸ 3. Judging defaults, only if criteria were given.
    judging = model.get("judging")
    if isinstance(judging, dict) and judging.get("criteria"):
        if not judging.get("score_range"):
            judging["score_range"] = [0, 10]
            defaults_applied["judging.score_range"] = [0, 10]
        if not judging.get("aggregation"):
            judging["aggregation"] = "weighted_average"
            defaults_applied["judging.aggregation"] = "weighted_average"
        if not judging.get("judges_per_entity"):
            judging["judges_per_entity"] = 3
            defaults_applied["judging.judges_per_entity"] = 3

    return model, defaults_applied

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# build_stage_pipeline â€” deterministic workflow generation (preview + commit share this)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _build_custom_stage_specs(custom_stages: list[dict]) -> list[dict]:
    """Builds StageSpec dicts straight from the organizer's own ordered stage plan
    (custom_workflow_stages), instead of the fixed per-event-type template. Returns
    [] if every entry turned out to have a blank name, so the caller can fall back."""
    valid_hints = {"SUBMISSION", "MATCHUP", "ASSESSMENT", "AUTOMATED"}
    used_keys: set[str] = set()
    specs: list[dict] = []
    seq = 1
    has_gate = False

    for entry in custom_stages:
        name = (entry.get("name") or "").strip()
        if not name:
            continue
        engine = entry.get("engine_hint")
        if engine not in valid_hints:
            engine = "SUBMISSION"
        gate = bool(entry.get("gate_after"))
        has_gate = has_gate or gate
        specs.append({
            "key": _unique_slug(name, used_keys), "name": name, "sequence": seq,
            "engine": engine, "audience": "committee", "approval_required": gate,
            "engine_config": {}, "system": False,
        })
        seq += 1

    if specs and not has_gate:
        specs[-1]["approval_required"] = True  # safety net: guarantee one approval gate

    return specs


def build_stage_pipeline(model: dict) -> list[dict]:
    """Returns ordered StageSpec dicts: {key, name, sequence, engine, audience,
    approval_required, engine_config, system}. Pure function â€” no DB, no LLM â€”
    so it can be used for both the pre-commit preview and the actual commit.

    When the organizer explicitly described their own stage-by-stage workflow
    (custom_workflow_stages), that ordered list is used as-is â€” it already
    decides for itself which standard building blocks (Participant Intake, Team
    Formation, Team Approval, etc.) to include or skip. Otherwise, falls back to
    the original deterministic system-prefix + per-event-type template, unchanged."""
    custom_specs = _build_custom_stage_specs(model.get("custom_workflow_stages") or [])
    if custom_specs:
        return custom_specs

    event_type = normalize_event_type(model.get("event_type"))
    mode = model.get("mode", "team")
    template = STAGE_TEMPLATES.get(event_type, STAGE_TEMPLATES["custom"])

    specs: list[dict] = []
    seq = 1

    specs.append({
        "key": "participant_intake", "name": "Participant Intake", "sequence": seq,
        "engine": "SUBMISSION", "audience": "committee", "approval_required": False,
        "engine_config": {"accepts": ["csv"], "required_fields": ["name", "email"]},
        "system": True,
    })
    seq += 1

    if mode == "team":
        specs.append({
            "key": "team_formation_system", "name": "Team Formation", "sequence": seq,
            "engine": "AUTOMATED", "audience": "committee", "approval_required": False,
            "engine_config": {"type": "team_matching",
                               "factors": (model.get("participants") or {}).get("team_formation_factors") or []},
            "system": True,
        })
        seq += 1
        specs.append({
            "key": "team_approval", "name": "Team Approval", "sequence": seq,
            "engine": "ASSESSMENT", "audience": "committee", "approval_required": True,
            "engine_config": {"type": "committee_review"},
            "system": True,
        })
        seq += 1

    for entry in template:
        engine_config: dict = {}
        if entry.get("content_field"):
            engine_config[entry["content_field"]] = model.get(entry["content_field"]) or []
        specs.append({
            "key": entry["key"], "name": entry["name"], "sequence": seq,
            "engine": entry["engine"], "audience": entry.get("audience", "committee"),
            "approval_required": bool(entry.get("gate_after")),
            "engine_config": engine_config, "system": False,
        })
        seq += 1

    return specs


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# LLM helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async def _extract_model_llm(user_text: str, current_model: dict) -> dict:
    """Run the extractor LLM to merge user message into the Universal Event Model."""
    if _llm is None:
        return current_model
    try:
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=EXTRACTOR_SYSTEM),
            HumanMessage(content=(
                f"CURRENT EVENT MODEL:\n{json.dumps(current_model, ensure_ascii=False)}\n\n"
                f"USER MESSAGE:\n{user_text}"
            )),
        ]
        response = await _llm.ainvoke(messages)
        raw = response.content.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            updated = json.loads(raw)
        except Exception:
            # Model added stray text around the JSON object â€” salvage the
            # {...} block instead of discarding the whole extraction.
            start, end = raw.find("{"), raw.rfind("}")
            if start == -1 or end == -1 or end <= start:
                raise
            updated = json.loads(raw[start:end + 1])

        _deep_preserve(current_model, updated)
        updated["event_type"] = normalize_event_type(updated.get("event_type"))
        return updated
    except Exception as e:
        print(f"[config_agent] extractor error: {e}")
        return current_model


def _deep_preserve(existing: dict, updated: dict):
    """Recursively preserve existing non-null values that the LLM may have dropped."""
    for k, v in existing.items():
        if v is None or v == {} or v == []:
            continue
        if k not in updated or updated[k] is None:
            updated[k] = v
        elif isinstance(v, dict) and isinstance(updated.get(k), dict):
            _deep_preserve(v, updated[k])


def _build_conversation_messages(req_messages: list[Message], model: dict,
                                  stage_preview: list[dict], defaults_applied: dict,
                                  validation_errors: list[str]) -> list:
    try:
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        system = (
            CONVERSATION_SYSTEM
            .replace("{blueprint}", json.dumps(model, indent=2) if model else "Empty â€” nothing collected yet.")
            .replace("{stage_preview}", json.dumps(stage_preview, indent=2) if stage_preview else "None yet.")
            .replace("{defaults_applied}", json.dumps(defaults_applied, indent=2) if defaults_applied else "None yet.")
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
# File processing helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def _extract_pdf_text(file_content: str) -> str:
    """Extract text from PDF file (base64 encoded)."""
    try:
        import PyPDF2
        pdf_bytes = base64.b64decode(file_content)
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"[config_agent] PDF extraction error: {e}")
        return "[PDF content could not be extracted]"


def _transcribe_voice(file_content: str) -> str:
    try:
        import whisper
        import base64
        import io

        audio_bytes = base64.b64decode(file_content)

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        model = whisper.load_model("base")
        result = model.transcribe(tmp_path)

        import os
        os.unlink(tmp_path)

        return result["text"]
    except Exception as e:
        print(f"[config_agent] Whisper error: {e}")
        return "[Voice transcription failed]"


def _process_file_message(message: Message) -> str:
    """Process a message that may contain a file attachment."""
    text = message.content or ""

    if message.file_type == "pdf" and message.file_content:
        extracted_text = _extract_pdf_text(message.file_content)
        text = f"{text}\n\n[PDF Content]:\n{extracted_text}" if text else extracted_text
    elif message.file_type == "voice" and message.file_content:
        transcribed_text = _transcribe_voice(message.file_content)
        text = f"{text}\n\n[Voice Transcription]:\n{transcribed_text}" if text else transcribed_text

    return text.strip()


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Universal-model decomposition â€” entities / event_details, for persistence + preview
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def build_entities(model: dict) -> dict:
    return {
        "activities": model.get("activities") or [],
        "tracks": model.get("tracks") or [],
        "committees": model.get("committees") or [],
        "competition_categories": model.get("competition_categories") or [],
        "roles": model.get("roles") or [],
        "deliverables": model.get("deliverables") or [],
        "constraints": model.get("constraints") or [],
        "special_requirements": model.get("special_requirements") or [],
    }


def build_event_details(model: dict) -> dict:
    return {
        "participants": model.get("participants") or {},
        "resources": model.get("resources") or {},
        "timeline": model.get("timeline") or {},
        "judging": model.get("judging") or {},
        "feature_flags": model.get("feature_flags") or {},
    }


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# DB helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async def _upsert_draft(
    db: AsyncSession,
    draft_id: Optional[str],
    messages: list[Message],
    model: dict,
    summary_text: Optional[str],
    committee_member_id: Optional[int],
) -> EventDraft:
    msgs_json = [{"role": m.role, "content": m.content} for m in messages]

    if draft_id:
        result = await db.execute(select(EventDraft).where(EventDraft.id == uuid.UUID(draft_id)))
        draft = result.scalar_one_or_none()
        if draft:
            draft.messages = msgs_json
            draft.collected_fields = model  # reuse collected_fields to store the universal model
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
        collected_fields=model,
        summary_text=summary_text,
        status="confirmed" if summary_text else "draft",
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%B %d, %Y", "%b %d, %Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(date_str, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _build_event_from_blueprint(model: dict, committee_member_id: Optional[int],
                                 stage_config: dict) -> Event:
    event_type = normalize_event_type(model.get("event_type"))
    mode = model.get("mode", "team")
    participants = model.get("participants") or {}
    timeline = model.get("timeline") or {}
    expected_count = participants.get("expected_count")

    return Event(
        id=uuid.uuid4(),
        name=model.get("event_name", "Unnamed Event"),
        event_type=event_type,
        description=model.get("description"),
        config_source="conversational",
        config_status="configured",
        event_mode="dynamic",
        event_mode_type=mode,
        expected_teams=expected_count if mode == "team" else None,
        expected_participants=expected_count if mode == "solo" else None,
        timezone=timeline.get("timezone"),
        registration_deadline=_parse_date(timeline.get("registration_deadline")),
        start_date=_parse_date(timeline.get("start_date")),
        end_date=_parse_date(timeline.get("end_date")),
        current_participant_stage="intake",
        current_committee_stage="intake",
        is_submission_open=False,
        configured_at=datetime.now(timezone.utc),
        created_by=committee_member_id,
        # Normalized config lives in Stage/JudgingCriterion/EventScoringConfig/etc,
        # but the /dynamic-test/* sandbox pages still read stage_config.stages directly â€”
        # build that view too so the chatbot's output actually renders there.
        stage_config=stage_config,
    )


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Dynamic-sandbox bridge â€” translates the generated stage pipeline into the
# stage_config.stages shape the /dynamic-test/* pages (DynamicTestLayout nav,
# DynamicSandboxCaseConfig form) read. The sandbox form only understands two
# visual tracks (case-competition, coding-contest); other event types still get
# a real nav built from their own stage pipeline, just without that form.
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DEFAULT_TEST_CASES = [
    {"id": 1, "input": "5\n1 2 3 4 5", "output": "15", "weight": 50, "visibility": "public"},
    {"id": 2, "input": "0", "output": "0", "weight": 50, "visibility": "hidden"},
]

DEFAULT_RUBRIC_CRITERIA = [
    {"name": "Innovation", "weight": 25},
    {"name": "Feasibility", "weight": 25},
    {"name": "Market Size", "weight": 25},
    {"name": "Presentation", "weight": 25},
]

DEFAULT_NDA_TEXT = (
    "Participants agree to preserve absolute confidentiality regarding all internal "
    "metrics, case materials, and discussions shared during this competition."
)


def _build_coding_rules(model: dict) -> dict:
    return {
        "problem_statement_name": model.get("description") or "Untitled Coding Challenge",
        "sandbox_timeout_ms": 4000,
        "memory_limit_mb": 256,
        "allowed_languages": ["C++", "Python", "Java"],
        "plagiarism_threshold": 70,
        "freeze_leaderboard": False,
        "freeze_time": "60",
        "max_submissions": 100,
        "cooldown_seconds": 10,
        "scoring_mode": "acm",
        "tab_switch_limit": 3,
        "camera_monitoring": False,
        "test_cases": DEFAULT_TEST_CASES,
    }


def _build_case_rules(model: dict) -> dict:
    judging = model.get("judging") or {}
    rubric = []
    for crit in judging.get("criteria") or []:
        if not isinstance(crit, dict):
            continue
        w = float(crit.get("weight", 0) or 0)
        rubric.append({"name": crit.get("name", "Criterion"), "weight": round(w * 100 if w <= 1.0 else w)})

    timeline = model.get("timeline") or {}
    return {
        "case_title": model.get("description") or "Untitled Case Challenge",
        "release_mode": "scheduled" if timeline.get("registration_deadline") else "immediate",
        "require_nda": True,
        "nda_text": DEFAULT_NDA_TEXT,
        "judge_pool_size": int(judging.get("judges_per_entity") or 4),
        "rounds": model.get("competition_categories") or ["PPT Submission", "Case Analysis", "Final Presentation"],
        "judges_per_team": int(judging.get("judges_per_entity") or 3),
        "presentation_duration": 15,
        "qa_duration": 5,
        "rubric_criteria": rubric or DEFAULT_RUBRIC_CRITERIA,
    }


def _build_shared_rules(model: dict) -> dict:
    participants = model.get("participants") or {}
    return {
        "email_reminder": True,
        "max_participants": int(participants.get("expected_count") or 500),
        "qualification_rule": "top-20",
        "max_upload_size": 20,
        "deliverables_manifest": model.get("deliverables") or [],
    }


# Fixed nav for the /dynamic-test/* sandbox (DynamicTestLayout + its child routes in
# App.jsx) â€” that route tree only ever registered these 9 paths, regardless of event
# type, so this list must stay exactly what it was; it is NOT where the new per-event-type
# workflow lives (that's build_stage_pipeline -> the real Stage DB rows below). This is
# purely the legacy bridge for the one case/coding-contest tester UI.
DYNAMIC_SANDBOX_NAV = [
    ("dynamic-dashboard", "Dashboard Overview", "dashboard"),
    ("case-config", "Case Configuration", "config"),
    ("anti-cheat", "Anti-Cheat & Integrity", "shield"),
    ("intake-formation", "Intake & Formation", "intake"),
    ("team-review", "Team Review", "teams"),
    ("assign-mentors", "Mentor Assignment", "mentor"),
    ("schedule", "Schedule", "schedule"),
    ("judges", "Judges", "judge"),
    ("results", "Results & Leaderboard", "results"),
]


def _build_dynamic_stage_config(model: dict, stage_specs: list[dict]) -> dict:
    event_type = normalize_event_type(model.get("event_type"))
    is_coding = event_type == "coding_contest"
    is_case = event_type == "case_competition"

    # Retain the context configuration payloads for the core engine views
    case_config_payload = {
        "coding_rules": _build_coding_rules(model) if is_coding else None,
        "case_rules": _build_case_rules(model) if is_case else None,
        "shared_rules": _build_shared_rules(model),
    }

    # ðŸ”„ DYNAMIC NAVBAR: Build layout navigation directly out of the real stage pipeline specs
    stages = []
    
    # Always keep an overview dashboard or core entry point at the top of the nav
    # stages.append({
    #     "sequence_order": 0,
    #     "stage_id": "dynamic-dashboard",
    #     "display_name": "Dashboard Overview",
    #     "component_route": "/dynamic-test/dynamic-dashboard",
    #     "icon": "dashboard"
    # })

    # Dynamically populate the rest of the layout from the real stage matrix
    for spec in stage_specs:
        stage_key = spec["key"]  # e.g., 'registration', 'participant_intake', 'peer_review'

        # âœ… Skip duplicate dashboard â€” the template's "dashboard" stage IS the dashboard
        # Rename it to "dynamic-dashboard" so DynamicComponentSelector maps it correctly
        if stage_key == "dashboard":
            stage_key = "dynamic-dashboard"
            
        # Pick an intuitive sidebar icon based on the active structural engine type
        engine_type = spec["engine"]
        icon = "config"
        if engine_type == "SUBMISSION":
            icon = "intake"
        elif engine_type == "ASSESSMENT":
            icon = "judge"
        elif engine_type == "MATCHUP":
            icon = "teams"

        stage_payload = {
            "sequence_order": spec["sequence"],
            "stage_id": stage_key,
            "display_name": spec["name"],  # Will display real titles like "Hackathon Round 1"
            "component_route": f"/dynamic-test/{stage_key}",
            "icon": icon,
        }

        # Attach standard testing payload contexts to rules pages dynamically
        if stage_key in ("case-config", "case_config", "problem_statement"):
            stage_payload["config"] = case_config_payload
            
        stages.append(stage_payload)

    return {
        "blueprint_mode": True,
        "event_type": event_type,
        "sandbox_track": "coding-contest" if is_coding else ("case-competition" if is_case else "generic"),
        "shared_rules": _build_shared_rules(model),
        "stage_pipeline": stage_specs,
        "stages": stages,  # âœ… Your sidebar layout will now dynamically loop through these values
    }


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Stage row builder â€” converts the deterministic StageSpec dicts into Stage ORM rows
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ENGINE_TO_STAGE_TYPE = {
    "SUBMISSION": "submission",
    "MATCHUP": "team_formation",   # closest legacy type
    "ASSESSMENT": "evaluation",
    "AUTOMATED": "custom",
}


def build_stage_rows(stage_specs: list[dict], event_id) -> list[Stage]:
    rows = []
    for spec in stage_specs:
        rows.append(Stage(
            id=uuid.uuid4(),
            event_id=event_id,
            name=spec["name"],
            description="",
            sequence_order=spec["sequence"],
            engine_type=spec["engine"],
            stage_type=ENGINE_TO_STAGE_TYPE.get(spec["engine"], "custom"),
            engine_config=spec.get("engine_config") or {},
            config={"source": "system" if spec["system"] else "template", "system_phase": spec["system"],
                    "key": spec["key"]},
            status="upcoming",
            audience=spec["audience"],
            is_committee_visible=True,
            is_system_phase=spec["system"],
            approval_required=spec["approval_required"],
        ))
    return rows


def _build_criteria_from_model(model: dict, event_id, stages: list[Stage]) -> list[JudgingCriterion]:
    judging = model.get("judging") or {}
    raw_criteria = judging.get("criteria") or []
    if not raw_criteria:
        return []

    score_range = judging.get("score_range") or [0, 10]
    max_score = float(score_range[1]) if len(score_range) > 1 else 10.0

    judging_stage = next((s for s in stages if s.engine_type == "ASSESSMENT" and not s.is_system_phase), None)

    criteria_rows = []
    for i, crit in enumerate(raw_criteria):
        if not isinstance(crit, dict):
            continue
        raw_w = float(crit.get("weight", crit.get("weight_pct", 0)) or 0)
        weight_pct = raw_w * 100 if raw_w <= 1.0 else raw_w
        criteria_rows.append(JudgingCriterion(
            id=uuid.uuid4(),
            event_id=event_id,
            stage_id=judging_stage.id if judging_stage else None,
            name=crit.get("name", f"Criterion {i+1}"),
            description=crit.get("description", ""),
            weight=weight_pct / 100.0,
            max_score=max_score,
            sort_order=i,
        ))
    return criteria_rows


def _build_scoring_config(model: dict, event_id) -> Optional[EventScoringConfig]:
    judging = model.get("judging") or {}
    if not judging.get("criteria"):
        return None

    score_range = judging.get("score_range") or [0, 10]
    agg_map = {"average": "average", "weighted_average": "weighted_average", "trimmed_mean": "trimmed_mean"}
    agg = agg_map.get(str(judging.get("aggregation") or "weighted_average").lower(), "weighted_average")

    return EventScoringConfig(
        id=uuid.uuid4(),
        event_id=event_id,
        score_scale_min=float(score_range[0]) if score_range else 0,
        score_scale_max=float(score_range[1]) if len(score_range) > 1 else 10,
        aggregation_method=agg,
        anomaly_threshold_pct=20.0,
        judges_per_team=int(judging.get("judges_per_entity") or 2),
        total_judges=None,
        mentor_count=0,
        judge_selection="expertise_based",
        judge_overlap="single_stage",
        qualitative_feedback=bool(judging.get("qualitative_feedback", True)),
    )


def _build_team_formation_config(model: dict, event_id) -> Optional[EventTeamFormationConfig]:
    participants = model.get("participants") or {}
    if model.get("mode") != "team":
        return None
    return EventTeamFormationConfig(
        id=uuid.uuid4(),
        event_id=event_id,
        min_size=int(participants.get("team_size_min") or 1),
        max_size=int(participants.get("team_size_max") or 1),
        factors=participants.get("team_formation_factors") or [],
    )


def _build_portal_config(model: dict, event_id, stages: list[Stage]) -> EventPortalConfig:
    judging = model.get("judging") or {}
    has_gate = any(s.approval_required for s in stages)
    return EventPortalConfig(
        id=uuid.uuid4(),
        event_id=event_id,
        evaluator_role_label=judging.get("judge_role_label", "Evaluator"),
        evaluator_blind_judging=bool(judging.get("blind_judging", False)),
        evaluator_can_comment=True,
        evaluator_assignment_via="portal",
        committee_can_override_scores=True,
        committee_approval_gates=has_gate,
        announcement_channels=["in_app", "email"],
    )


def _build_event_budget(model: dict, event_id) -> Optional[EventBudget]:
    budget = (model.get("resources") or {}).get("budget")
    if not isinstance(budget, dict) or budget.get("total") is None:
        return None
    return EventBudget(
        id=uuid.uuid4(),
        event_id=event_id,
        total_budget=budget.get("total"),
        currency=budget.get("currency") or "INR",
        sponsorship_target=budget.get("sponsorship_target"),
        track_expenses=bool(budget.get("track_expenses", True)),
        track_sponsorship=bool(budget.get("track_sponsorship", True)),
    )


def _build_committee_roles(model: dict, event_id) -> list[EventCommitteeRole]:
    roles = model.get("roles") or []
    return [
        EventCommitteeRole(id=uuid.uuid4(), event_id=event_id, role_name=name, sort_order=i)
        for i, name in enumerate(roles) if isinstance(name, str) and name.strip()
    ]


def _build_resource_requirements(model: dict, event_id, stages: list[Stage]) -> list[EventResourceRequirement]:
    requirements = (model.get("resources") or {}).get("requirements") or []
    rows = []
    for req in requirements:
        if not isinstance(req, dict) or not req.get("label"):
            continue
        linked_stage = None
        for_stage = req.get("for_stage")
        if for_stage:
            linked_stage = next((s for s in stages if s.name.lower() == str(for_stage).lower()), None)
        rows.append(EventResourceRequirement(
            id=uuid.uuid4(),
            event_id=event_id,
            stage_id=linked_stage.id if linked_stage else None,
            category=req.get("category") or "staffing",
            label=req["label"],
            quantity=req.get("quantity"),
            notes=req.get("notes"),
        ))
    return rows


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Shared turn processing â€” defaults + stage preview + validation
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _process_turn(model: dict) -> tuple[dict, dict, list[dict], list[str]]:
    """Runs apply_defaults -> build_stage_pipeline -> validation. Returns
    (model, defaults_applied, stage_specs, validation_errors)."""
    model, defaults_applied = apply_defaults(model)
    stage_specs = build_stage_pipeline(model)
    is_custom = bool(model.get("custom_workflow_stages"))
    errors = validate_universal_model(model)
    errors += validate_stage_pipeline(
        model, stage_specs, required_stage_names(model.get("event_type", "custom")),
        is_custom=is_custom,
    )
    return model, defaults_applied, stage_specs, errors


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Routes
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/init", response_model=ChatResponse)
async def init_chat(db: AsyncSession = Depends(get_db)):
    """Return the agent's opening greeting."""
    greeting = (
        "Hi! I'm HackSmart's AI Event Architect. I can configure any kind of event â€” "
        "a coding contest, hackathon, case competition, MUN, debate, sports tournament, "
        "workshop, conference, festival, startup competition, research symposium, or anything "
        "else you have in mind. Just describe the event and I'll ask only what's critical; "
        "everything else gets a sensible default you can review before approving. "
        "What are you organizing?"
    )
    return ChatResponse(
        reply=greeting, is_summary=False, is_approved=False,
        blueprint={}, entities=build_entities({}), stage_preview=[], defaults_applied={},
        validation_errors=[], draft_id=None,
    )


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    last_user_msg = None
    for m in reversed(req.messages):
        if m.role == "user":
            last_user_msg = m
            break

    if not last_user_msg:
        raise HTTPException(
            status_code=400,
            detail="No user message found. Ensure at least one message has role='user'."
        )

    last_user = _process_file_message(last_user_msg)

    if not last_user.strip():
        raise HTTPException(status_code=400, detail="No user message content found.")

    # 1. Extract/update the universal event model from the user message
    updated_model = await _extract_model_llm(last_user, req.blueprint or {})

    # 2. Defaults + stage pipeline + validation
    updated_model, defaults_applied, stage_specs, validation_errors = _process_turn(updated_model)

    # 3. Check for approval intent
    is_approved = _is_approval(last_user)

    # 4. Get conversational reply
    reply = ""
    is_summary = False
    summary_text = None
    try:
        if _llm:
            processed_messages = list(req.messages[:-1])
            processed_messages.append(Message(role="user", content=last_user))

            lc = _build_conversation_messages(processed_messages, updated_model, stage_specs,
                                               defaults_applied, validation_errors)
            response = await _llm.ainvoke(lc)
            reply = response.content
        else:
            reply = (
                "I'm running in offline mode â€” no LLM API key configured. "
                "Set GROQ_API_KEY to enable the agent."
            )

        is_summary = "---BLUEPRINT_SUMMARY---" in reply and "---END_BLUEPRINT_SUMMARY---" in reply
        if is_summary:
            start = reply.index("---BLUEPRINT_SUMMARY---") + len("---BLUEPRINT_SUMMARY---")
            end = reply.index("---END_BLUEPRINT_SUMMARY---")
            summary_text = reply[start:end].strip()

    except Exception:
        import traceback
        traceback.print_exc()
        reply = "I ran into an issue processing that. Please try again."

    # 5. Persist draft
    draft = await _upsert_draft(
        db,
        draft_id=req.draft_id,
        messages=req.messages + [Message(role="assistant", content=reply)],
        model=updated_model,
        summary_text=summary_text,
        committee_member_id=req.committee_member_id,
    )

    return ChatResponse(
        reply=reply,
        is_summary=is_summary,
        is_approved=is_approved,
        blueprint=updated_model,
        entities=build_entities(updated_model),
        stage_preview=stage_specs,
        defaults_applied=defaults_applied,
        validation_errors=validation_errors,
        draft_id=str(draft.id),
    )


@router.post("/regenerate", response_model=ChatResponse)
async def regenerate(req: RegenerateRequest, db: AsyncSession = Depends(get_db)):
    """Re-run defaults + stage-template generation against the draft's current
    extracted model â€” no LLM call. Lets the committee rebuild the workflow/defaults
    preview cheaply after editing fields, without re-describing the whole event."""
    result = await db.execute(select(EventDraft).where(EventDraft.id == uuid.UUID(req.draft_id)))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    model = draft.collected_fields or {}
    model, defaults_applied, stage_specs, validation_errors = _process_turn(model)

    draft.collected_fields = model
    draft.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(draft)

    return ChatResponse(
        reply="Workflow and defaults regenerated from the current event details.",
        is_summary=False,
        is_approved=False,
        blueprint=model,
        entities=build_entities(model),
        stage_preview=stage_specs,
        defaults_applied=defaults_applied,
        validation_errors=validation_errors,
        draft_id=str(draft.id),
    )


@router.post("/commit", response_model=CommitResponse)
async def commit_event(req: CommitRequest, db: AsyncSession = Depends(get_db)):
    """
    Atomically create all DB rows from an approved EventDraft.
    Creates: Event, Stage[], JudgingCriterion[], EventScoringConfig, EventBlueprint, etc.
    """
    result = await db.execute(select(EventDraft).where(EventDraft.id == uuid.UUID(req.draft_id)))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status == "committed":
        raise HTTPException(status_code=400, detail="Draft already committed")

    model = draft.collected_fields or {}

        # â”€â”€ Auto-normalize judging weights before validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Fixes LLM output where too many criteria were generated and weights
    # don't sum to 1.0 (decimal) or 100.0 (percentage). Normalizes them
    # proportionally so the validator always passes on weight-sum checks.
    judging = model.get("judging")
    if isinstance(judging, dict):
        criteria = [c for c in (judging.get("criteria") or []) if isinstance(c, dict)]
        if criteria:
            raw = [float(c.get("weight") or 0) for c in criteria]
            total = sum(raw)
            max_w = max(raw, default=0)
            # Determine effective total in percentage terms
            total_pct = total * 100 if max_w <= 1.0 else total
            if total > 0 and abs(total_pct - 100.0) > 2.0:
                print(f"[commit] Auto-normalizing {len(criteria)} judging criteria "
                      f"(weights summed to {total_pct:.1f}% â†’ normalizing to 100%)")
                for c in criteria:
                    if c.get("weight") is not None:
                        c["weight"] = round(float(c["weight"]) / total, 4)
                # Fix floating-point residual on the last criterion
                actual_sum = sum(float(c.get("weight", 0)) for c in criteria)
                residual = round(1.0 - actual_sum, 4)
                for c in reversed(criteria):
                    if c.get("weight") is not None:
                        c["weight"] = round(float(c["weight"]) + residual, 4)
                        break

    model, defaults_applied, stage_specs, errors = _process_turn(model)

    if errors:
        print(f"[commit] VALIDATION ERRORS for draft {req.draft_id}:")
        for e in errors:
            print(f"  âœ— {e}")
        print(f"[commit] MODEL SNAPSHOT: {json.dumps(model.get('judging'), indent=2)}")  # judging is the usual culprit
        raise HTTPException(
            status_code=422,
            detail={"message": "Event model has validation errors", "errors": errors},
        )

    # â”€â”€ 1. Stage config (sandbox bridge) + Event â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    stage_config = _build_dynamic_stage_config(model, stage_specs)
    event = _build_event_from_blueprint(model, req.committee_member_id, stage_config)
    event.event_details = build_event_details(model)
    event.defaults_applied = defaults_applied
    event.ai_extracted_entities = build_entities(model)
    db.add(event)
    await db.flush()

    # â”€â”€ 2. Stages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    stages = build_stage_rows(stage_specs, event.id)
    for s in stages:
        db.add(s)
    await db.flush()

    # â”€â”€ 3. Judging Criteria â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for c in _build_criteria_from_model(model, event.id, stages):
        db.add(c)

    # â”€â”€ 4. Scoring Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    scoring = _build_scoring_config(model, event.id)
    if scoring:
        db.add(scoring)

    # â”€â”€ 5. Team Formation Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    team_formation = _build_team_formation_config(model, event.id)
    if team_formation:
        db.add(team_formation)

    # â”€â”€ 6. Portal Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    db.add(_build_portal_config(model, event.id, stages))

    # â”€â”€ 7. Budget / Committee Roles / Resource Requirements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    budget = _build_event_budget(model, event.id)
    if budget:
        db.add(budget)
    for role in _build_committee_roles(model, event.id):
        db.add(role)
    for requirement in _build_resource_requirements(model, event.id, stages):
        db.add(requirement)

    # â”€â”€ 8. EventBlueprint (full model snapshot) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    blueprint_row = EventBlueprint(
        id=uuid.uuid4(),
        event_id=event.id,
        draft_id=draft.id,
        blueprint=model,
        status="active",
        version=1,
    )
    db.add(blueprint_row)

    # â”€â”€ 9. Mark draft committed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    draft.event_id = event.id
    draft.status = "committed"
    draft.approved_at = datetime.now(timezone.utc)

    await db.commit()

    return CommitResponse(
        event_id=str(event.id),
        event_name=event.name,
        phase_count=len(stages),
        blueprint_id=str(blueprint_row.id),
        message=f"'{event.name}' created with {len(stages)} stages.",
    )


@router.get("/draft/{draft_id}")
async def get_draft(draft_id: str, db: AsyncSession = Depends(get_db)):
    """Resume a saved draft (after browser close / session restore)."""
    result = await db.execute(select(EventDraft).where(EventDraft.id == uuid.UUID(draft_id)))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    model = draft.collected_fields or {}
    _, defaults_applied, stage_specs, validation_errors = _process_turn(dict(model)) if model else (model, {}, [], [])
    return {
        "draft_id": str(draft.id),
        "messages": draft.messages,
        "blueprint": model,
        "entities": build_entities(model),
        "stage_preview": stage_specs,
        "defaults_applied": defaults_applied,
        "validation_errors": validation_errors,
        "summary_text": draft.summary_text,
        "status": draft.status,
        "event_id": str(draft.event_id) if draft.event_id else None,
    }


@router.post("/validate")
async def validate_draft(blueprint: dict):
    """Validate a universal event model without saving. Useful for frontend real-time checks."""
    model, defaults_applied, stage_specs, errors = _process_turn(dict(blueprint))
    return {"valid": len(errors) == 0, "errors": errors, "stage_preview": stage_specs,
            "defaults_applied": defaults_applied}
