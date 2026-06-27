-- ============================================================
-- Migration 008: Universal Event Model columns
-- ============================================================
-- Run this once against an existing database.
-- SQLAlchemy's create_all also handles this on fresh installs.
--
-- These three columns hold the output of the AI Event Architect
-- (backend/app/services/config_agent.py):
--   event_details          — participants, resources, timeline, judging
--   defaults_applied       — which optional fields were auto-filled, and why
--   ai_extracted_entities  — activities, tracks, committees, competition_categories,
--                            roles, deliverables, constraints, special_requirements
-- event_type and stage_config already exist on events (migration 005 / base schema).
-- ============================================================

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS event_details JSON DEFAULT '{}'::json,
    ADD COLUMN IF NOT EXISTS defaults_applied JSON DEFAULT '{}'::json,
    ADD COLUMN IF NOT EXISTS ai_extracted_entities JSON DEFAULT '{}'::json;
