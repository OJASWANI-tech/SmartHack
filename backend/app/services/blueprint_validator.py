"""
blueprint_validator.py — Validates the Universal Event Model before DB commit.

Two passes:
  validate_universal_model(model)            — structural/content correctness
  validate_stage_pipeline(model, stage_specs) — the generated workflow is sane and
                                                  never confuses activities/tracks/
                                                  committees/categories with stages
"""
from __future__ import annotations
from typing import Any

VALID_MODES = {"solo", "team"}
VALID_AGGREGATIONS = {"average", "weighted_average", "trimmed_mean"}
VALID_RESOURCE_CATEGORIES = {"staffing", "venue", "equipment", "medical"}

# Known event types — anything else is accepted but falls back to the "custom"
# stage template (see config_agent.STAGE_TEMPLATES). Not an error to be outside
# this set; only used by callers that want to warn about an unrecognized type.
KNOWN_EVENT_TYPES = {
    "coding_contest", "hackathon", "case_competition", "mun", "debate",
    "sports_tournament", "workshop", "conference", "cultural_festival",
    "technical_festival", "startup_competition", "research_symposium", "custom",
}


def validate_universal_model(model: dict) -> list[str]:
    errors: list[str] = []

    if not isinstance(model, dict) or not model:
        return ["Event model is empty."]

    if not model.get("event_name"):
        errors.append("Event name is required.")
    if not model.get("event_type"):
        errors.append("Event type is required.")
    if not model.get("description"):
        errors.append("Event description is required.")

    mode = model.get("mode")
    if mode not in VALID_MODES:
        errors.append(f"Event mode must be 'solo' or 'team', got: {mode!r}")

    participants = model.get("participants")
    if not isinstance(participants, dict):
        participants = {}
    if not participants.get("expected_count"):
        errors.append("Expected participant/team count (participants.expected_count) is required.")

    if mode == "team":
        min_s = participants.get("team_size_min")
        max_s = participants.get("team_size_max")
        if min_s and max_s and isinstance(min_s, int) and isinstance(max_s, int) and min_s > max_s:
            errors.append(f"team_size_min ({min_s}) cannot exceed team_size_max ({max_s}).")

    errors.extend(_validate_judging(model.get("judging")))
    errors.extend(_validate_resources(model.get("resources")))

    return errors


def _validate_judging(judging: Any) -> list[str]:
    errors: list[str] = []
    if not judging:
        return errors
    if not isinstance(judging, dict):
        errors.append("judging must be an object if present.")
        return errors

    criteria = judging.get("criteria")
    if criteria:
        if not isinstance(criteria, list):
            errors.append("judging.criteria must be a list.")
        else:
            raw_weights = [float(c.get("weight", 0) or 0) for c in criteria if isinstance(c, dict)]
            raw_weights = []
            for c in criteria:
                if isinstance(c, dict):
                    w = c.get("weight")
                    # Safely interpret None or unparseable text values as 0.0 instead of crashing
                    if w is None:
                        raw_weights.append(0.0)
                    else:
                        try:
                            raw_weights.append(float(w))
                        except (ValueError, TypeError):
                            raw_weights.append(0.0)

            total_weight = sum(raw_weights)

            # Detect decimal fraction form: if the largest single weight is <= 1.0,
            # all weights are fractions → scale the total to percentage for comparison.
            # This correctly handles: [0.25, 0.25, 0.25, 0.25] → 100%
            # AND catches bad LLM output: [0.25 × 15 criteria] → 300% (still fails)
            if raw_weights and max(raw_weights) <= 1.0:
                total_weight = total_weight * 100
            if abs(total_weight - 100.0) > 2.0:
                errors.append(f"judging.criteria weights must sum to 100% (got {total_weight:.1f}%).")
            if not judging.get("judges_per_entity"):
                errors.append("judging.judges_per_entity is required when criteria are set.")

    agg = judging.get("aggregation")
    if agg and agg not in VALID_AGGREGATIONS:
        errors.append(f"judging.aggregation invalid '{agg}'. Must be one of {VALID_AGGREGATIONS}.")

    sr = judging.get("score_range")
    if sr and (not isinstance(sr, list) or len(sr) != 2):
        errors.append("judging.score_range must be [min, max].")

    return errors


def _validate_resources(resources: Any) -> list[str]:
    errors: list[str] = []
    if resources is None:
        return errors
    if not isinstance(resources, dict):
        errors.append("resources must be an object if present.")
        return errors

    budget = resources.get("budget")
    if isinstance(budget, dict):
        total = budget.get("total")
        if total is not None and (not isinstance(total, (int, float)) or total < 0):
            errors.append(f"resources.budget.total must be a non-negative number, got: {total!r}")

    requirements = resources.get("requirements")
    if requirements is not None:
        if not isinstance(requirements, list):
            errors.append("resources.requirements must be a list.")
        else:
            for i, req in enumerate(requirements):
                if not isinstance(req, dict):
                    continue
                category = req.get("category")
                if category not in VALID_RESOURCE_CATEGORIES:
                    errors.append(
                        f"resources.requirements[{i}]: invalid category {category!r}. "
                        f"Valid: {VALID_RESOURCE_CATEGORIES}."
                    )
                if not req.get("label"):
                    errors.append(f"resources.requirements[{i}]: label is required.")

    return errors


def validate_stage_pipeline(
    model: dict, stage_specs: list[dict], required_stage_names: list[str],
    is_custom: bool = False,
) -> list[str]:
    """stage_specs: list of {"key", "name", "sequence", ...} produced by
    config_agent.build_stage_pipeline. required_stage_names: the template names
    expected for this event_type (from STAGE_TEMPLATES), excluding system stages.
    is_custom: True when stage_specs came from the organizer's own
    custom_workflow_stages plan rather than the fixed per-event-type template —
    in that case there's no fixed template to compare names against, so the
    required-name check is skipped in favor of a generic approval-gate check."""
    errors: list[str] = []

    if not stage_specs:
        errors.append("No workflow stages were generated.")
        return errors

    keys = [s.get("key") for s in stage_specs]
    if len(keys) != len(set(keys)):
        errors.append("Generated stage ids/keys must be unique.")

    sequences = sorted(s.get("sequence") for s in stage_specs)
    if sequences != list(range(1, len(sequences) + 1)):
        errors.append("Generated stage sequence numbers must be a contiguous 1..N ordering.")

    stage_names_lower = {str(s.get("name", "")).strip().lower() for s in stage_specs}
    if is_custom:
        if not any(s.get("approval_required") for s in stage_specs):
            errors.append("Custom workflow must include at least one stage requiring committee approval.")
    else:
        missing = [name for name in required_stage_names if name.lower() not in stage_names_lower]
        if missing:
            errors.append(f"Workflow is missing required stage(s) for this event type: {', '.join(missing)}.")

    # Critical rule: activities/tracks/committees/categories must never be stages.
    content_lists = {
        "activities": model.get("activities") or [],
        "tracks": model.get("tracks") or [],
        "committees": model.get("committees") or [],
        "competition_categories": model.get("competition_categories") or [],
    }
    for field_name, items in content_lists.items():
        for item in items:
            if isinstance(item, str) and item.strip().lower() in stage_names_lower:
                errors.append(
                    f"'{item}' is listed under {field_name} but also appears as a workflow stage name — "
                    f"{field_name} are content groupings, not stages."
                )

    return errors