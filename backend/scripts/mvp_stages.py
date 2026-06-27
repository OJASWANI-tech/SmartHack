import asyncio
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.stage import Stage


MVP_COMMITTEE_STAGES = [
    {
        "name":             "Participant Intake",
        "description":      "Load and verify participant roster via CSV upload",
        "sequence_order":   1,
        "stage_type":       "registration",
        "approval_required": False,
    },
    {
        "name":             "Team Formation",
        "description":      "Algorithmically form teams and generate LLM rationale",
        "sequence_order":   2,
        "stage_type":       "team_formation",
        "approval_required": False,
    },
    {
        "name":             "Team Review & Approval",
        "description":      "Review teams, approve, and send welcome and team assignment emails to participants",
        "sequence_order":   3,
        "stage_type":       "selection",
        "approval_required": True,
    },
    {
        "name":             "Mentor Assignment",
        "description":      "Mentors are allocated to approved teams",
        "sequence_order":   4,
        "stage_type":       "custom",
        "approval_required": True,
    },
    {
        "name":             "Build Phase",
        "description":      "Teams work on developing their projects",
        "sequence_order":   5,
        "stage_type":       "custom",
        "approval_required": False,
    },
    {
        "name":             "Evaluation",
        "description":      "Judges score each team via dedicated evaluator interface",
        "sequence_order":   6,
        "stage_type":       "evaluation",
        "approval_required": False,
    },
    {
        "name":             "Final Result",
        "description":      "Final results published and event closed",
        "sequence_order":   7,
        "stage_type":       "result",
        "approval_required": False,
    },
]

MVP_PARTICIPANT_STAGES = [
    {
        "name":           "Team Connect",
        "description":    "Connect with your teammates and get familiar with them",
        "sequence_order": 1,
        "stage_type":     "custom",
    },
    {
        "name":           "Mentor Connect",
        "description":    "Connect with your mentor",
        "sequence_order": 2,
        "stage_type":     "custom",
    },
    {
        "name":           "Build Phase",
        "description":    "Build your project",
        "sequence_order": 3,
        "stage_type":     "custom",
    },
    {
        "name":           "Submission",
        "description":    "Submit your code, video and PPT before the deadline",
        "sequence_order": 4,
        "stage_type":     "submission",
    },
    {
        "name":           "Evaluation",
        "description":    "Projects are being reviewed and scored by evaluators",
        "sequence_order": 5,
        "stage_type":     "evaluation",
    },
    {
        "name":           "Final Result",
        "description":    "Rankings and winners announced",
        "sequence_order": 6,
        "stage_type":     "result",
    },
]


async def seed_mvp_stages(event_id: UUID, db: AsyncSession) -> list[Stage]:
    """
    Creates all MVP hackathon stages for a fixed-pipeline event.
    Call this inside the event creation transaction when config_source = 'fixed'.
    """
    all_stages = []

    for s in MVP_COMMITTEE_STAGES:
        all_stages.append(Stage(
            event_id             = event_id,
            name                 = s["name"],
            description          = s["description"],
            sequence_order       = s["sequence_order"],
            stage_type           = s["stage_type"],
            approval_required    = s.get("approval_required", False),
            is_committee_visible = True,
            audience             = "committee",
            status               = "upcoming",
            config               = {},
            deliverables         = {},
            resources            = {},
        ))

    for s in MVP_PARTICIPANT_STAGES:
        all_stages.append(Stage(
            event_id             = event_id,
            name                 = s["name"],
            description          = s["description"],
            sequence_order       = s["sequence_order"],
            stage_type           = s["stage_type"],
            approval_required    = False,
            is_committee_visible = False,
            audience             = "participant",
            status               = "upcoming",
            config               = {},
            deliverables         = {},
            resources            = {},
        ))

    db.add_all(all_stages)
    await db.flush()
    return all_stages