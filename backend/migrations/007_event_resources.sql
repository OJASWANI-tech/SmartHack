-- ============================================================
-- Migration 007: Event Budget, Committee Roles & Resource Requirements
-- ============================================================
-- Run this once against an existing database.
-- SQLAlchemy's create_all also handles this on fresh installs.
-- ============================================================

-- 0. events — overall event date range (separate from registration_deadline)
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_date   TIMESTAMPTZ;

-- 1. event_budget — one row per event
CREATE TABLE IF NOT EXISTS event_budget (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID         NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    total_budget        NUMERIC(14,2),
    currency            VARCHAR(10)  DEFAULT 'INR',
    sponsorship_target  NUMERIC(14,2),
    track_expenses      BOOLEAN      DEFAULT TRUE,
    track_sponsorship   BOOLEAN      DEFAULT TRUE,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_budget_event ON event_budget(event_id);

-- 2. event_committee_roles — many rows per event
CREATE TABLE IF NOT EXISTS event_committee_roles (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    role_name   VARCHAR(150) NOT NULL,
    description TEXT,
    sort_order  INTEGER      DEFAULT 0,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committee_roles_event ON event_committee_roles(event_id);

-- 3. event_resource_requirements — many rows per event, optionally tied to a phase
CREATE TABLE IF NOT EXISTS event_resource_requirements (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage_id    UUID         REFERENCES stages(id) ON DELETE SET NULL,
    category    VARCHAR(20)  NOT NULL,   -- staffing | venue | equipment | medical
    label       VARCHAR(150) NOT NULL,
    quantity    INTEGER,
    notes       TEXT,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_requirements_event ON event_resource_requirements(event_id);
CREATE INDEX IF NOT EXISTS idx_resource_requirements_stage ON event_resource_requirements(stage_id);
