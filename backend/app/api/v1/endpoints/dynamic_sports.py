"""
dynamic_sports.py â€” Sports-track extension of the /api/dynamic runtime engine.

Adds the structured data the generic dynamic engine (dynamic_runtime.py) doesn't
model: real fixtures/brackets (DynamicMatch) and roster lineup metadata on top of
the existing Team/TeamMember/Participant rows that the sports committee intakHackSmart
already writes via /api/v1/events/{id}/form-teams. This file is purely additive â€”
it never modifies dynamic_runtime.py, teams.py, or any /committee, /participant,
/evaluator route â€” so other event types and the MVP flow are unaffected.

Routes (prefix /api/dynamic/sports):
  GET  /event/{event_id}/teams                          -> teams + members + roster fields
  PUT  /event/{event_id}/teams/{team_id}/roster          -> upsert lineup (position/jersey/status)
  GET  /event/{event_id}/matches                         -> fixtures/bracket, newest round first... ordered for bracket render
  POST /event/{event_id}/matches/generate-bracket        -> (re)generate fixtures for a format
  PUT  /event/{event_id}/matches/{match_id}              -> live score/status update + advancement
  GET  /event/{event_id}/standings                       -> simple win/loss table
"""

from __future__ import annotations

import csv
import io
import math
import random
import re
import string
import uuid
from datetime import datetime
from typing import Optional, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.event import Event
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.participant import Participant
from app.models.dynamic_match import DynamicMatch
from app.models.dynamic_referee import DynamicReferee

router = APIRouter(prefix="/api/dynamic/sports", tags=["dynamic-sports"])


def _row_get(row: dict, *names: str) -> str:
    """Case/spacing-insensitive lookup across a CSV DictReader row."""
    norm = {(k or "").strip().lower().replace(" ", "_"): v for k, v in row.items()}
    for n in names:
        v = norm.get(n)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


def _read_csv_rows(raw: bytes) -> list[dict]:
    try:
        decoded = raw.decode("utf-8")
    except UnicodeDecodeError:
        decoded = raw.decode("latin-1")
    return list(csv.DictReader(io.StringIO(decoded)))


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


async def _load_event(db: AsyncSession, event_id: str) -> Event:
    try:
        eid = uuid.UUID(str(event_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid event id.")
    event = (await db.execute(select(Event).where(Event.id == eid))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Teams + roster
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def _serialize_team(team: Team) -> dict:
    members = []
    for tm in team.members:
        p = tm.participant
        if not p:
            continue
        members.append({
            "id": str(tm.id),
            "participant_id": str(p.id),
            "name": f"{p.first_name} {p.last_name}".strip(),
            "email": p.email,
            "institution": p.institution,
            "is_leader": bool(tm.is_leader),
            "position": tm.position,
            "jersey_number": tm.jersey_number,
            "athlete_status": tm.athlete_status or "active",
        })
    return {
        "id": str(team.id),
        "event_id": str(team.event_id),
        "name": team.name,
        "approval_status": team.approval_status or "proposed",
        "challenge": team.challenge,
        "members": members,
    }


@router.get("/event/{event_id}/teams")
async def list_sports_teams(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)
    teams = (
        await db.execute(
            select(Team)
            .where(Team.event_id == event.id)
            .options(selectinload(Team.members).selectinload(TeamMember.participant))
            .order_by(Team.created_at)
        )
    ).scalars().all()
    return [_serialize_team(t) for t in teams]


class RosterMemberUpdate(BaseModel):
    id: str  # team_members.id
    position: Optional[str] = None
    jersey_number: Optional[int] = None
    athlete_status: Optional[str] = None


class RosterUpdateRequest(BaseModel):
    members: list[RosterMemberUpdate] = []


@router.put("/event/{event_id}/teams/{team_id}/roster")
async def update_roster(event_id: str, team_id: str, req: RosterUpdateRequest, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)
    try:
        tid = uuid.UUID(team_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid team id.")

    team = (
        await db.execute(
            select(Team)
            .where(Team.id == tid, Team.event_id == event.id)
            .options(selectinload(Team.members).selectinload(TeamMember.participant))
        )
    ).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found for this event.")

    by_id = {str(m.id): m for m in team.members}
    valid_status = {"active", "injured", "benched"}
    for update in req.members:
        member = by_id.get(update.id)
        if not member:
            continue
        if update.position is not None:
            member.position = update.position.strip() or None
        if update.jersey_number is not None:
            member.jersey_number = update.jersey_number
        if update.athlete_status is not None and update.athlete_status in valid_status:
            member.athlete_status = update.athlete_status

    await db.commit()
    await db.refresh(team, attribute_names=["members"])
    return _serialize_team(team)


@router.post("/event/{event_id}/teams/upload-csv")
async def upload_teams_csv(event_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Deterministic team provisioning from a roster CSV â€” columns: team_name,
    player_name, and optionally email / institution. Unlike the MVP intake
    engine (which randomly balances an uploaded roster into N teams of a given
    size), this creates exactly the teams named in the file, get-or-create on
    team name and participant email, so re-uploading an updated CSV is safe.
    """
    event = await _load_event(db, event_id)
    rows = _read_csv_rows(await file.read())
    if not rows:
        raise HTTPException(status_code=422, detail="CSV file is empty.")

    sample_keys = {(k or "").strip().lower().replace(" ", "_") for k in rows[0].keys()}
    if "team_name" not in sample_keys and "team" not in sample_keys:
        raise HTTPException(status_code=422, detail="CSV must include a 'team_name' column.")
    if not ({"player_name", "player", "name"} & sample_keys):
        raise HTTPException(status_code=422, detail="CSV must include a 'player_name' column.")

    existing_teams = (await db.execute(select(Team).where(Team.event_id == event.id))).scalars().all()
    teams_by_name = {t.name.strip().lower(): t for t in existing_teams}

    existing_emails = {
        e.lower() for e in (await db.execute(select(Participant.email).where(Participant.event_id == event.id))).scalars().all()
    }

    teams_created = 0
    players_created = 0
    skipped: list[str] = []

    for i, row in enumerate(rows, start=2):  # header occupies line 1
        team_name = _row_get(row, "team_name", "team")
        player_name = _row_get(row, "player_name", "player", "name")
        if not team_name or not player_name:
            skipped.append(f"Row {i}: missing team_name or player_name.")
            continue

        key = team_name.lower()
        team = teams_by_name.get(key)
        if not team:
            team = Team(id=uuid.uuid4(), event_id=event.id, name=team_name, approval_status="approved", challenge="Sports Tournament")
            db.add(team)
            await db.flush()
            teams_by_name[key] = team
            teams_created += 1

        email = _row_get(row, "email").lower()
        if not email or "@" not in email:
            player_slug = re.sub(r"[^a-z0-9]+", ".", player_name.lower()).strip(".")
            team_slug = re.sub(r"[^a-z0-9]+", "-", team_name.lower()).strip("-")
            email = f"{player_slug}.{team_slug}@roster.dynamic"

        if email in existing_emails:
            participant = (
                await db.execute(select(Participant).where(Participant.event_id == event.id, Participant.email == email))
            ).scalar_one_or_none()
        else:
            name_parts = player_name.split(" ", 1)
            institution = _row_get(row, "institution", "club", "school")
            participant = Participant(
                id=uuid.uuid4(), event_id=event.id,
                first_name=name_parts[0], last_name=name_parts[1] if len(name_parts) > 1 else "",
                email=email, institution=institution or None,
            )
            db.add(participant)
            await db.flush()
            existing_emails.add(email)
            players_created += 1

        already_linked = (
            await db.execute(select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.participant_id == participant.id))
        ).scalar_one_or_none()
        if not already_linked:
            db.add(TeamMember(id=uuid.uuid4(), team_id=team.id, participant_id=participant.id))

    await db.commit()

    teams = (
        await db.execute(
            select(Team).where(Team.event_id == event.id)
            .options(selectinload(Team.members).selectinload(TeamMember.participant))
            .order_by(Team.created_at)
        )
    ).scalars().all()
    return {
        "teams_created": teams_created,
        "players_created": players_created,
        "skipped": skipped,
        "teams": [_serialize_team(t) for t in teams],
    }


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Referees
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def _serialize_referee(r: DynamicReferee) -> dict:
    return {
        "id": str(r.id),
        "name": r.name,
        "email": r.email,
        "assigned_sport": r.assigned_sport,
        "access_code": r.access_code,
        "created_at": _iso(r.created_at),
    }


def _generate_access_code(taken: set[str]) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choices(alphabet, k=6))
        if code not in taken:
            return code


@router.post("/event/{event_id}/referees/upload-csv")
async def upload_referees_csv(event_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Provisions referees with a generated access_code â€” the 'simple profile
    lock' a referee enters on the Referee Console to unlock their queue."""
    event = await _load_event(db, event_id)
    rows = _read_csv_rows(await file.read())
    if not rows:
        raise HTTPException(status_code=422, detail="CSV file is empty.")

    sample_keys = {(k or "").strip().lower().replace(" ", "_") for k in rows[0].keys()}
    if not ({"name", "referee_name"} & sample_keys):
        raise HTTPException(status_code=422, detail="CSV must include a 'name' column.")

    existing = (await db.execute(select(DynamicReferee).where(DynamicReferee.event_id == event.id))).scalars().all()
    by_name = {r.name.strip().lower(): r for r in existing}
    taken_codes = {r.access_code for r in existing}

    created: list[DynamicReferee] = []
    skipped: list[str] = []

    for i, row in enumerate(rows, start=2):
        name = _row_get(row, "name", "referee_name")
        if not name:
            skipped.append(f"Row {i}: missing name.")
            continue
        if name.lower() in by_name:
            skipped.append(f"Row {i}: '{name}' is already provisioned.")
            continue

        code = _generate_access_code(taken_codes)
        taken_codes.add(code)
        ref = DynamicReferee(
            id=uuid.uuid4(), event_id=event.id, name=name,
            email=_row_get(row, "email") or None,
            assigned_sport=_row_get(row, "assigned_sport", "assigned_matches", "sport") or None,
            access_code=code,
        )
        db.add(ref)
        created.append(ref)
        by_name[name.lower()] = ref

    await db.commit()
    return {"created": [_serialize_referee(r) for r in created], "skipped": skipped}


@router.get("/event/{event_id}/referees")
async def list_referees(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)
    refs = (
        await db.execute(select(DynamicReferee).where(DynamicReferee.event_id == event.id).order_by(DynamicReferee.created_at))
    ).scalars().all()
    return [_serialize_referee(r) for r in refs]


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Matches / fixtures / bracket
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async def _team_name_map(db: AsyncSession, event_id) -> dict[str, str]:
    teams = (await db.execute(select(Team).where(Team.event_id == event_id))).scalars().all()
    return {str(t.id): t.name for t in teams}


def _serialize_match(m: DynamicMatch, names: dict[str, str]) -> dict:
    def side(team_id):
        if not team_id:
            return None
        tid = str(team_id)
        return {"id": tid, "name": names.get(tid, "TBD")}

    return {
        "id": str(m.id),
        "round_name": m.round_name,
        "round_number": m.round_number,
        "match_number": m.match_number,
        "bracket_format": m.bracket_format,
        "team_a": side(m.team_a_id),
        "team_b": side(m.team_b_id),
        "team_a_score": m.team_a_score,
        "team_b_score": m.team_b_score,
        "winner_team_id": str(m.winner_team_id) if m.winner_team_id else None,
        "next_match_id": str(m.next_match_id) if m.next_match_id else None,
        "venue": m.venue,
        "scheduled_at": _iso(m.scheduled_at),
        "referee_label": m.referee_label,
        "status": m.status,
        "event_log": m.event_log or [],
        "notes": m.notes,
    }


@router.get("/event/{event_id}/matches")
async def list_matches(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)
    matches = (
        await db.execute(
            select(DynamicMatch)
            .where(DynamicMatch.event_id == event.id)
            .order_by(DynamicMatch.round_number, DynamicMatch.match_number)
        )
    ).scalars().all()
    names = await _team_name_map(db, event.id)
    return [_serialize_match(m, names) for m in matches]


class GenerateBracketRequest(BaseModel):
    format: str = "single_elim"  # single_elim | round_robin
    team_ids: Optional[list[str]] = None  # defaults to all teams on the event


ROUND_LABELS = ["Final", "Semifinal", "Quarterfinal"]


def _round_name(rounds_from_final: int) -> str:
    if rounds_from_final < len(ROUND_LABELS):
        return ROUND_LABELS[rounds_from_final]
    return f"Round of {2 ** (rounds_from_final + 1)}"


@router.post("/event/{event_id}/matches/generate-bracket")
async def generate_bracket(event_id: str, req: GenerateBracketRequest, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)

    if req.team_ids:
        try:
            wanted = {uuid.UUID(t) for t in req.team_ids}
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid team id in team_ids.")
        teams = (
            await db.execute(select(Team).where(Team.event_id == event.id, Team.id.in_(wanted)))
        ).scalars().all()
    else:
        teams = (await db.execute(select(Team).where(Team.event_id == event.id))).scalars().all()

    if len(teams) < 2:
        raise HTTPException(status_code=400, detail="At least 2 teams are required to generate fixtures.")

    # Regenerating replaces the existing fixture set for this event.
    existing = (await db.execute(select(DynamicMatch).where(DynamicMatch.event_id == event.id))).scalars().all()
    for m in existing:
        await db.delete(m)
    await db.flush()

    team_ids = [t.id for t in teams]
    created: list[DynamicMatch] = []

    if req.format == "round_robin":
        match_number = 1
        for i in range(len(team_ids)):
            for j in range(i + 1, len(team_ids)):
                created.append(DynamicMatch(
                    id=uuid.uuid4(), event_id=event.id, round_name="Round Robin", round_number=1,
                    match_number=match_number, bracket_format="round_robin",
                    team_a_id=team_ids[i], team_b_id=team_ids[j], status="scheduled",
                ))
                match_number += 1
        db.add_all(created)
    else:
        # single_elim â€” pad to the next power of two with byes (null = bye slot).
        size = 2 ** math.ceil(math.log2(len(team_ids)))
        slots: list[Optional[uuid.UUID]] = list(team_ids) + [None] * (size - len(team_ids))

        total_rounds = int(math.log2(size))
        rounds_matches: list[list[DynamicMatch]] = []
        current_slots = slots
        for round_idx in range(total_rounds):
            rounds_from_final = total_rounds - round_idx - 1
            round_matches = []
            for slot_idx in range(0, len(current_slots), 2):
                a = current_slots[slot_idx]
                b = current_slots[slot_idx + 1] if slot_idx + 1 < len(current_slots) else None
                match = DynamicMatch(
                    id=uuid.uuid4(), event_id=event.id, round_name=_round_name(rounds_from_final),
                    round_number=round_idx + 1, match_number=(slot_idx // 2) + 1,
                    bracket_format="single_elim",
                    team_a_id=a if round_idx == 0 else None,
                    team_b_id=b if round_idx == 0 else None,
                    status="scheduled",
                )
                # First round with a bye auto-advances â€” resolved after wiring next_match_id below.
                round_matches.append(match)
                created.append(match)
            rounds_matches.append(round_matches)
            current_slots = [None] * len(round_matches)

        db.add_all(created)
        await db.flush()

        # Wire advancement pointers: each match in round i feeds slot (i // 2) of round i+1.
        for round_idx in range(total_rounds - 1):
            for slot_idx, match in enumerate(rounds_matches[round_idx]):
                match.next_match_id = rounds_matches[round_idx + 1][slot_idx // 2].id

        # Auto-resolve byes in round 1 so the bracket doesn't stall on an empty slot.
        for match in rounds_matches[0]:
            if match.team_a_id and not match.team_b_id:
                match.status = "completed"
                match.winner_team_id = match.team_a_id
            elif match.team_b_id and not match.team_a_id:
                match.status = "completed"
                match.winner_team_id = match.team_b_id
        await db.flush()
        for match in rounds_matches[0]:
            if match.status == "completed" and match.next_match_id:
                nxt = next(m for r in rounds_matches for m in r if m.id == match.next_match_id)
                if nxt.team_a_id is None:
                    nxt.team_a_id = match.winner_team_id
                elif nxt.team_b_id is None:
                    nxt.team_b_id = match.winner_team_id

    await db.commit()
    names = await _team_name_map(db, event.id)
    matches = (
        await db.execute(
            select(DynamicMatch).where(DynamicMatch.event_id == event.id)
            .order_by(DynamicMatch.round_number, DynamicMatch.match_number)
        )
    ).scalars().all()
    return [_serialize_match(m, names) for m in matches]


class MatchUpdateRequest(BaseModel):
    team_a_score: Optional[int] = None
    team_b_score: Optional[int] = None
    status: Optional[str] = None  # scheduled | live | completed
    venue: Optional[str] = None
    scheduled_at: Optional[str] = None
    referee_label: Optional[str] = None
    append_event: Optional[dict[str, Any]] = None  # {type, label}


@router.put("/event/{event_id}/matches/{match_id}")
async def update_match(event_id: str, match_id: str, req: MatchUpdateRequest, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)
    try:
        mid = uuid.UUID(match_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid match id.")

    match = (
        await db.execute(select(DynamicMatch).where(DynamicMatch.id == mid, DynamicMatch.event_id == event.id))
    ).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found for this event.")

    if req.team_a_score is not None:
        match.team_a_score = req.team_a_score
    if req.team_b_score is not None:
        match.team_b_score = req.team_b_score
    if req.venue is not None:
        match.venue = req.venue
    if req.referee_label is not None:
        match.referee_label = req.referee_label
    if req.scheduled_at:
        try:
            match.scheduled_at = datetime.fromisoformat(req.scheduled_at)
        except ValueError:
            raise HTTPException(status_code=400, detail="scheduled_at must be ISO-8601.")
    if req.append_event:
        log = list(match.event_log or [])
        log.append(req.append_event)
        match.event_log = log
    if req.status:
        if req.status not in {"scheduled", "live", "completed"}:
            raise HTTPException(status_code=400, detail="status must be scheduled, live, or completed.")
        match.status = req.status
        if req.status == "completed":
            if match.team_a_score is not None and match.team_b_score is not None and match.team_a_score != match.team_b_score:
                match.winner_team_id = match.team_a_id if match.team_a_score > match.team_b_score else match.team_b_id
            if match.winner_team_id and match.next_match_id:
                nxt = (
                    await db.execute(select(DynamicMatch).where(DynamicMatch.id == match.next_match_id))
                ).scalar_one_or_none()
                if nxt:
                    if nxt.team_a_id is None:
                        nxt.team_a_id = match.winner_team_id
                    elif nxt.team_b_id is None:
                        nxt.team_b_id = match.winner_team_id

    await db.commit()
    names = await _team_name_map(db, event.id)
    await db.refresh(match)
    return _serialize_match(match, names)


@router.get("/event/{event_id}/standings")
async def standings(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await _load_event(db, event_id)
    teams = (await db.execute(select(Team).where(Team.event_id == event.id))).scalars().all()
    matches = (
        await db.execute(select(DynamicMatch).where(DynamicMatch.event_id == event.id, DynamicMatch.status == "completed"))
    ).scalars().all()

    table: dict[str, dict] = {
        str(t.id): {"team_id": str(t.id), "team_name": t.name, "wins": 0, "losses": 0, "draws": 0, "played": 0}
        for t in teams
    }
    for m in matches:
        a, b = str(m.team_a_id) if m.team_a_id else None, str(m.team_b_id) if m.team_b_id else None
        if not a or not b or a not in table or b not in table:
            continue
        table[a]["played"] += 1
        table[b]["played"] += 1
        winner = str(m.winner_team_id) if m.winner_team_id else None
        if winner == a:
            table[a]["wins"] += 1
            table[b]["losses"] += 1
        elif winner == b:
            table[b]["wins"] += 1
            table[a]["losses"] += 1
        else:
            table[a]["draws"] += 1
            table[b]["draws"] += 1

    rows = sorted(table.values(), key=lambda r: (-r["wins"], r["losses"]))
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return {"event_id": str(event.id), "standings": rows}

