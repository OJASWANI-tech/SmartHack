-- ============================================================
-- Migration 006: Proper Event Config Tables
-- Replaces the stage_config JSON blob with queryable tables
-- ============================================================

-- 1. Clean up events.stage_config — add proper scalar columns instead
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS event_mode_type    VARCHAR(10)  DEFAULT 'team',   -- 'solo' | 'team'
    ADD COLUMN IF NOT EXISTS expected_teams     INTEGER,
    ADD COLUMN IF NOT EXISTS expected_participants INTEGER,
    ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS timezone           VARCHAR(60);

-- 2. Team formation config — one row per event
CREATE TABLE IF NOT EXISTS event_team_formation_config (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID        NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    min_size        INTEGER     NOT NULL DEFAULT 1,
    max_size        INTEGER     NOT NULL DEFAULT 1,
    factors         TEXT[]      NOT NULL DEFAULT '{}',   -- e.g. {"skill_level","domain_preference","institute"}
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_formation_event ON event_team_formation_config(event_id);

-- 3. Portal config — evaluator + committee settings, one row per event
CREATE TABLE IF NOT EXISTS event_portal_config (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                    UUID        NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,

    -- Evaluator portal
    evaluator_role_label        VARCHAR(50) DEFAULT 'Evaluator',  -- Judge | Referee | Evaluator
    evaluator_blind_judging     BOOLEAN     DEFAULT FALSE,
    evaluator_can_comment       BOOLEAN     DEFAULT TRUE,
    evaluator_assignment_via    VARCHAR(20) DEFAULT 'portal',     -- 'email' | 'portal'

    -- Committee config
    committee_can_override_scores BOOLEAN   DEFAULT TRUE,
    committee_approval_gates    BOOLEAN     DEFAULT TRUE,
    announcement_channels       TEXT[]      DEFAULT '{"in_app"}', -- email | in_app | sms

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_config_event ON event_portal_config(event_id);

-- 4. Mark system-generated stages so they can be filtered from organiser view
ALTER TABLE stages
    ADD COLUMN IF NOT EXISTS is_system_phase BOOLEAN NOT NULL DEFAULT FALSE;