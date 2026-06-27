-- ============================================================
-- Migration 005: Dynamic Event Configuration Support
-- ============================================================
-- Run this once against an existing database.
-- SQLAlchemy's create_all also handles this on fresh installs.
-- ============================================================

-- 1. Add new columns to events table (safe — IF NOT EXISTS)
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS description    TEXT,
    ADD COLUMN IF NOT EXISTS config_source  VARCHAR(20) NOT NULL DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS config_status  VARCHAR(30) NOT NULL DEFAULT 'configured',
    ADD COLUMN IF NOT EXISTS configured_at  TIMESTAMPTZ;

-- 2. event_drafts — persists conversational agent sessions
CREATE TABLE IF NOT EXISTS event_drafts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID        REFERENCES events(id) ON DELETE CASCADE,
    created_by        INTEGER     REFERENCES committee_members(id),
    messages          JSONB       NOT NULL DEFAULT '[]',
    collected_fields  JSONB       NOT NULL DEFAULT '{}',
    summary_text      TEXT,
    status            VARCHAR(30) NOT NULL DEFAULT 'draft',
    revision_count    INTEGER     DEFAULT 0,
    approved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_drafts_event   ON event_drafts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_drafts_creator ON event_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_event_drafts_status  ON event_drafts(status);

-- 3. event_scoring_config — one row per dynamic event
CREATE TABLE IF NOT EXISTS event_scoring_config (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              UUID        NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    score_scale_min       NUMERIC(5,2) DEFAULT 0,
    score_scale_max       NUMERIC(5,2) DEFAULT 10,
    aggregation_method    VARCHAR(30)  NOT NULL DEFAULT 'weighted_average',
    trimmed_mean_pct      NUMERIC(4,2) DEFAULT 10.0,
    anomaly_threshold_pct NUMERIC(5,2) DEFAULT 20.0,
    judges_per_team       INTEGER      DEFAULT 2,
    total_judges          INTEGER,
    mentor_count          INTEGER      DEFAULT 0,
    judge_selection       VARCHAR(30)  DEFAULT 'expertise_based',
    judge_overlap         VARCHAR(30)  DEFAULT 'single_stage',
    qualitative_feedback  BOOLEAN      DEFAULT TRUE,
    created_at            TIMESTAMPTZ  DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_config_event ON event_scoring_config(event_id);

-- 4. event_communication_config — one row per trigger per event
CREATE TABLE IF NOT EXISTS event_communication_config (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage_id         UUID        REFERENCES stages(id) ON DELETE CASCADE,
    trigger_type     VARCHAR(50) NOT NULL,
    enabled          BOOLEAN     DEFAULT TRUE,
    template_key     VARCHAR(100),
    send_offset_hours INTEGER,
    recipient_scope  VARCHAR(50) NOT NULL DEFAULT 'all_participants',
    recipient_filter JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_config_event ON event_communication_config(event_id);
CREATE INDEX IF NOT EXISTS idx_comm_config_stage ON event_communication_config(stage_id);