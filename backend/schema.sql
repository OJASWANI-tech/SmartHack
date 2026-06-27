-- ============================================================
-- INTELLIGENT EVENT ORCHESTRATION SYSTEM — PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. COMMITTEE MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS committee_members (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    email            VARCHAR(255) UNIQUE NOT NULL,
    hashed_password  TEXT NOT NULL,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS is_verified       BOOLEAN     DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS invite_token      VARCHAR(200),
    ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS role              VARCHAR(50) DEFAULT 'member'
        CHECK (role IN ('member', 'admin'));

ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

    -- 1. Make hashed_password nullable (Google-only users won't have one)
ALTER TABLE committee_members
    ALTER COLUMN hashed_password DROP NOT NULL;

-- 2. Add Google Auth + password setup columns
ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS google_id                  VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS auth_provider              VARCHAR(50)  DEFAULT 'local'
        CHECK (auth_provider IN ('local', 'google', 'both')),
    ADD COLUMN IF NOT EXISTS avatar_url                 TEXT,
    ADD COLUMN IF NOT EXISTS password_setup_token       VARCHAR(200),
    ADD COLUMN IF NOT EXISTS password_setup_expires_at  TIMESTAMPTZ;

-- ============================================================
-- 2. EVENTS
-- ============================================================
-- CREATE TABLE events (
--     id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
--     name           TEXT        NOT NULL,
--     event_type     TEXT        NOT NULL,
--     current_participant_stage  TEXT        NOT NULL DEFAULT 'intake',
--     current_committee_stage    TEXT        NOT NULL DEFAULT 'intake',
--     is_submission_open         BOOLEAN     NOT NULL DEFAULT FALSE,
--     stage_config   JSONB       DEFAULT '{}',
--     created_at     TIMESTAMPTZ DEFAULT NOW(),
--     updated_at     TIMESTAMPTZ DEFAULT NOW()
-- );

-- config_source distinguishes MVP events ("fixed") from agent-configured ones ("conversational").
-- All downstream services check this and fall back to hardcoded defaults when "fixed".
CREATE TABLE IF NOT EXISTS events (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                        TEXT        NOT NULL,
    event_type                  TEXT        NOT NULL,

    -- Pipeline tracking (used by both paths)
    current_participant_stage   TEXT        NOT NULL DEFAULT 'intake',
    current_committee_stage     TEXT        NOT NULL DEFAULT 'intake',
    is_submission_open          BOOLEAN     NOT NULL DEFAULT FALSE,
    stage_config                JSONB       DEFAULT '{}',

    -- Dynamic config additions
    description                 TEXT,
    config_source               VARCHAR(20) NOT NULL DEFAULT 'fixed'
                                CHECK (config_source IN ('fixed', 'conversational')),
    config_status               VARCHAR(30) NOT NULL DEFAULT 'configured'
                                CHECK (config_status IN ('draft', 'configured', 'active', 'completed')),
    -- NOTE: MVP events skip the draft state and are inserted directly as 'configured'.
    --       Agent-created events start as 'draft' and transition to 'configured' on commit.

    configured_at               TIMESTAMPTZ,
    created_by                  INTEGER     REFERENCES committee_members(id),

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS event_mode VARCHAR(20) NOT NULL DEFAULT 'legacy'
        CHECK (event_mode IN ('legacy', 'dynamic'));

-- ============================================================
-- 2. COMMITTEE MEMBERS EVENTS 
-- ============================================================

CREATE TABLE IF NOT EXISTS committee_member_events (
    id        SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
    event_id  UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    role      VARCHAR(50) NOT NULL DEFAULT 'member'
              CHECK (role IN ('member', 'admin', 'owner')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_member_event UNIQUE (member_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_committee_member_events_member ON committee_member_events(member_id);
CREATE INDEX IF NOT EXISTS idx_committee_member_events_event  ON committee_member_events(event_id);


-- ============================================================
-- 3. EVENT DRAFTS  (conversational agent session persistence)
-- ============================================================
-- Persists the chatbot conversation while the committee is configuring a new event.
-- event_id is NULL during the conversation; set to the new event's id on commit.
-- One row per config session — allows resume after browser close.
CREATE TABLE IF NOT EXISTS event_drafts (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID        REFERENCES events(id) ON DELETE CASCADE,
    created_by              INTEGER     REFERENCES committee_members(id),

    -- Full conversation as [{role, content}] array
    messages                JSONB       NOT NULL DEFAULT '[]',

    -- Structured extracted fields (stages, criteria as arrays — not free-text)
    collected_fields        JSONB       NOT NULL DEFAULT '{}',

    -- LLM-generated summary text shown to committee before approval
    summary_text            TEXT,

    -- Lifecycle: draft → awaiting_clarification → confirmed
    status                  VARCHAR(30) DEFAULT 'draft'
                            CHECK (status IN ('draft', 'awaiting_clarification', 'confirmed', 'committed')),

    -- How many times the committee edited and re-confirmed
    revision_count          INTEGER     DEFAULT 0,

    approved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_drafts_event    ON event_drafts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_drafts_creator  ON event_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_event_drafts_status   ON event_drafts(status);

-- Distinguishes "committee confirmed the summary" from
-- "the commit endpoint ran and all DB rows were created."
-- ============================================================
ALTER TABLE event_drafts
    DROP CONSTRAINT IF EXISTS event_drafts_status_check;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'event_drafts_status_check'
    ) THEN
        ALTER TABLE event_drafts
            ADD CONSTRAINT event_drafts_status_check
                CHECK (status IN ('draft', 'awaiting_clarification', 'confirmed', 'committed'));
    END IF;
END $$;

-- ============================================================
-- 4. PARTICIPANTS
-- ============================================================


-- CREATE TABLE IF NOT EXISTS participants (
--     id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     event_id                  UUID NOT NULL,
--     first_name                VARCHAR NOT NULL,
--     last_name                 VARCHAR NOT NULL,
--     email                     VARCHAR NOT NULL,
--     phone                     VARCHAR,
--     institution               VARCHAR,
--     skill_tags                TEXT[],
--     experience_level          VARCHAR DEFAULT 'beginner',
--                               CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
--     domain                    VARCHAR,
--     portal_token              VARCHAR UNIQUE,
--     qualification_status      VARCHAR DEFAULT 'pending',
--     avatar_initials           VARCHAR,
--     progression_confirmed     BOOLEAN DEFAULT FALSE,
--     created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

--     CONSTRAINT fk_participants_event
--         FOREIGN KEY (event_id)
--         REFERENCES events(id)
--         ON DELETE CASCADE,

--     CONSTRAINT participants_event_email_uc
--         UNIQUE (event_id, email)
-- );

-- -- Indexes
-- CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
-- CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
-- CREATE INDEX IF NOT EXISTS idx_participants_qualification_status ON participants(qualification_status);
-- CREATE INDEX IF NOT EXISTS idx_participants_portal_token ON participants(portal_token);

CREATE TABLE IF NOT EXISTS participants (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                  UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    first_name                VARCHAR     NOT NULL,
    last_name                 VARCHAR     NOT NULL,
    email                     VARCHAR     NOT NULL,
    phone                     VARCHAR,
    institution               VARCHAR,
    skill_tags                TEXT[],
    experience_level          VARCHAR     DEFAULT 'beginner'
                              CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    domain                    VARCHAR,
    portal_token              VARCHAR     UNIQUE,
    qualification_status      VARCHAR     DEFAULT 'pending',
    avatar_initials           VARCHAR,
    progression_confirmed     BOOLEAN     DEFAULT FALSE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT participants_event_email_uc UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_participants_event_id          ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_email             ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_qualification     ON participants(qualification_status);
CREATE INDEX IF NOT EXISTS idx_participants_portal_token      ON participants(portal_token);

-- Stores event-format-specific fields the agent extracts
-- (GPA, weight class, age category, department, etc.)
-- Base columns (name, email, institution) stay as-is.
-- ============================================================
ALTER TABLE participants
    ADD COLUMN IF NOT EXISTS extended_profile JSONB NOT NULL DEFAULT '{}';

-- ============================================================
-- 5. TEAMS (Updated for Committee Dashboard)
-- ============================================================

-- CREATE TABLE IF NOT EXISTS teams (
--     id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
--     name                  TEXT NOT NULL,
--     challenge             TEXT,
--     llm_rationale         TEXT,
--     final_score           NUMERIC(5, 2),
    
--     approval_status       VARCHAR(20) DEFAULT 'proposed',
--                           CHECK (approval_status IN ('proposed', 'approved', 'announced', 'eliminated')),
--     approved_at           TIMESTAMPTZ,
--     evaluation_status     VARCHAR(20) DEFAULT 'not_started',
--                           CHECK (evaluation_status IN ('not_started', 'in_progress', 'completed')),
--     progression_status    VARCHAR(20) DEFAULT 'pending',
--                           CHECK (progression_status IN ('pending', 'qualified', 'rejected')),
    
--     -- Mentor Fields
--     mentor_name           VARCHAR(255),
--     mentor_company        VARCHAR(255),
--     mentor_email          VARCHAR(255),
--     next_session_datetime TIMESTAMPTZ,
    
--     created_at            TIMESTAMPTZ DEFAULT NOW(),
--     updated_at            TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Indexes
-- CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);
-- CREATE INDEX IF NOT EXISTS idx_teams_approval_status ON teams(approval_status);
-- CREATE INDEX IF NOT EXISTS idx_teams_evaluation_status ON teams(evaluation_status);
-- CREATE INDEX IF NOT EXISTS idx_teams_progression_status ON teams(progression_status);
-- CREATE INDEX IF NOT EXISTS idx_teams_mentor_email ON teams(mentor_email);

-- CREATE TABLE IF NOT EXISTS teams (
--     id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
--     name                  TEXT NOT NULL,
--     challenge             TEXT,
--     llm_rationale         TEXT,
--     final_score           NUMERIC(5, 2),
    
--     approval_status       VARCHAR(20) DEFAULT 'proposed',
--                           CHECK (approval_status IN ('proposed', 'approved', 'announced', 'eliminated')),
--     approved_at           TIMESTAMPTZ,
--     evaluation_status     VARCHAR(20) DEFAULT 'not_started',
--                           CHECK (evaluation_status IN ('not_started', 'in_progress', 'completed')),
--     progression_status    VARCHAR(20) DEFAULT 'pending',
--                           CHECK (progression_status IN ('pending', 'qualified', 'rejected')),
    
--     -- Mentor Fields
--     mentor_name           VARCHAR(255),
--     mentor_company        VARCHAR(255),
--     mentor_email          VARCHAR(255),
--     next_session_datetime TIMESTAMPTZ,
    
--     created_at            TIMESTAMPTZ DEFAULT NOW(),
--     updated_at            TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Indexes
-- CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);
-- CREATE INDEX IF NOT EXISTS idx_teams_approval_status ON teams(approval_status);
-- CREATE INDEX IF NOT EXISTS idx_teams_evaluation_status ON teams(evaluation_status);
-- CREATE INDEX IF NOT EXISTS idx_teams_progression_status ON teams(progression_status);
-- CREATE INDEX IF NOT EXISTS idx_teams_mentor_email ON teams(mentor_email);

CREATE TABLE IF NOT EXISTS teams (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name                  TEXT        NOT NULL,
    challenge             TEXT,
    challenge_id          UUID,       -- FK added below after challenges table
    llm_rationale         TEXT,
    final_score           NUMERIC(5, 2),

    approval_status       VARCHAR(20) DEFAULT 'proposed'
                          CHECK (approval_status IN ('proposed', 'approved', 'announced', 'rejected')),
    approved_at           TIMESTAMPTZ,

    evaluation_status     VARCHAR(20) DEFAULT 'not_started'
                          CHECK (evaluation_status IN ('not_started', 'in_progress', 'completed')),
    progression_status    VARCHAR(20) DEFAULT 'pending'
                          CHECK (progression_status IN ('pending', 'qualified', 'rejected')),

    mentor_name           VARCHAR(255),
    mentor_company        VARCHAR(255),
    mentor_email          VARCHAR(255),
    next_session_datetime TIMESTAMPTZ,

    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_event_id           ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_teams_approval_status    ON teams(approval_status);
CREATE INDEX IF NOT EXISTS idx_teams_evaluation_status  ON teams(evaluation_status);
CREATE INDEX IF NOT EXISTS idx_teams_progression_status ON teams(progression_status);
CREATE INDEX IF NOT EXISTS idx_teams_mentor_email       ON teams(mentor_email);

-- Stores format-specific team metadata that isn't universally
-- applicable (sponsor, advisor, track, division, etc.)
-- Hackathon-specific columns (mentor_*, challenge_id) stay
-- nullable for backward compat; new formats use extended_data.
-- ============================================================
ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS extended_data JSONB NOT NULL DEFAULT '{}';


-- ============================================================
-- 6. TEAM MEMBERS (Junction Table)
-- ============================================================
-- CREATE TABLE IF NOT EXISTS team_members (
--     id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     team_id           UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
--     participant_id    UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
--     is_leader         BOOLEAN DEFAULT FALSE,
--     created_at        TIMESTAMPTZ DEFAULT NOW(),
--     updated_at        TIMESTAMPTZ DEFAULT NOW(),

--     CONSTRAINT team_members_team_id_participant_id_key 
--         UNIQUE (team_id, participant_id)
-- );

CREATE TABLE IF NOT EXISTS team_members (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID    NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    participant_id  UUID    NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    is_leader       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT team_members_team_participant_uc UNIQUE (team_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team        ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_participant ON team_members(participant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_leader      ON team_members(is_leader);

-- ============================================================
-- 7. STAGES (Event Pipeline)
-- ============================================================
-- CREATE TABLE stages (
--     id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
--     name                VARCHAR(100) NOT NULL,   
--     description         TEXT,
--     sequence_order      INTEGER NOT NULL,        
--     status              VARCHAR(30) DEFAULT 'upcoming'
--                         CHECK (status IN ('upcoming', 'active', 'awaiting_approval', 'complete')),
--     approval_required   BOOLEAN DEFAULT FALSE,
--     is_participant_visible BOOLEAN DEFAULT FALSE,
--     is_committee_visible  BOOLEAN DEFAULT FALSE,
--     started_at          TIMESTAMPTZ,
--     completed_at        TIMESTAMPTZ,
--     created_at          TIMESTAMPTZ DEFAULT NOW()
-- );

-- INSERT INTO stages (event_id, name, description, sequence_order, approval_required, is_committee_visible) 
-- VALUES 
--     ((SELECT id FROM events LIMIT 1), 'Participant Intake',     'Load and verify participant roster via CSV upload',                                         1, FALSE, TRUE),
--     ((SELECT id FROM events LIMIT 1), 'Team Formation',         'Algorithmically form teams and generate LLM rationale',                                     2, FALSE, TRUE),
--     ((SELECT id FROM events LIMIT 1), 'Team Review & Approval', 'Review teams and approve them and Send welcome and team assignment emails to participants', 3, TRUE, TRUE),
--     ((SELECT id FROM events LIMIT 1), 'Mentor Assignment',      'Mentors are allocated to approved teams',                                                   4, TRUE, TRUE),
--     ((SELECT id FROM events LIMIT 1), 'Build Phase',            'Teams work on developing their projects',                                                   5, TRUE, TRUE),
--     ((SELECT id FROM events LIMIT 1), 'Evaluation',             'Judges(evaluators) score each team via dedicated evaluator interface',                      6, FALSE, TRUE),
--     ((SELECT id FROM events LIMIT 1), 'Final Result',           'Final results published and event closed',                                                  7, FALSE, TRUE),
--     ((SELECT id FROM events LIMIT 1), 'Team Connect',           'Connect with your teammates and get familiar with them',                                    1, FALSE, FALSE),
--     ((SELECT id FROM events LIMIT 1), 'Mentor Connect',         'Connect with your mentor ',                                                                 2, FALSE, FALSE),
--     ((SELECT id FROM events LIMIT 1), 'Build Phase',            'Build your project',                                                                        3, FALSE, FALSE),
--     ((SELECT id FROM events LIMIT 1), 'Submission',             'Submit your code, video and PPT before the deadline',                                       4, FALSE, FALSE),
--     ((SELECT id FROM events LIMIT 1), 'Evaluation',             'Projects are being reviewed and scored by the evaluators',                                  5, FALSE, FALSE),
--     ((SELECT id FROM events LIMIT 1), 'Final Result',           'Rankings and winners announced',                                                            6, FALSE, FALSE);

-- stage_type: tells the frontend which component to render and the engine
-- how to execute the stage. "custom" is the fallback for agent-defined stages
-- that don't match a known type.
-- config: machine-readable behavior per stage_type (rubric weights, team_size,
-- advance_count, submission constraints, etc.) — separate from deliverables/
-- resources which are participant-facing display fields.
-- MVP events: stages are seeded via INSERT below (config_source = 'fixed').
-- Dynamic events: stages are inserted by the commit endpoint (config_source = 'conversational').
CREATE TABLE IF NOT EXISTS stages (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name                    VARCHAR(100) NOT NULL,
    description             TEXT,
    sequence_order          INTEGER     NOT NULL,

    -- Dynamic config additions
    stage_type              VARCHAR(50) NOT NULL DEFAULT 'custom'
                            CHECK (stage_type IN (
                                'registration', 'team_formation', 'submission',
                                'evaluation', 'selection', 'interview',
                                'public_voting', 'result', 'custom'
                            )),
    -- Machine-readable per-stage config (rubric, team_size, advance_count, formats, etc.)
    config                  JSONB       DEFAULT '{}',

    status                  VARCHAR(30) DEFAULT 'upcoming'
                            CHECK (status IN ('upcoming', 'active', 'awaiting_approval', 'completed')),
    approval_required       BOOLEAN     DEFAULT FALSE,
    is_committee_visible    BOOLEAN     DEFAULT FALSE,

    -- Audience shorthand for agent-created stages
    audience                VARCHAR(20) DEFAULT 'both'
                            CHECK (audience IN ('committee', 'participant', 'both')),

    -- From migration 003
    instructions            TEXT,
    deliverables            JSONB       DEFAULT '{}',
    resources               JSONB       DEFAULT '{}',
    submission_deadline     TIMESTAMPTZ,
    tips                    TEXT,

    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stages_event_order ON stages(event_id, sequence_order);

-- ============================================================
-- MVP SEED: Hardcoded stages for the fixed hackathon pipeline.
-- These only insert when an event already exists (SELECT id FROM events LIMIT 1).
-- Dynamic events never hit this block — their stages come from the commit endpoint.
-- ============================================================
-- Committee-facing stages
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, approval_required, is_committee_visible, audience)
-- SELECT id, 'Participant Intake',     'Load and verify participant roster via CSV upload',                                        1, 'registration',   FALSE, TRUE, 'committee' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, approval_required, is_committee_visible, audience)
-- SELECT id, 'Team Formation',         'Algorithmically form teams and generate LLM rationale',                                    2, 'team_formation', FALSE, TRUE, 'committee' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, approval_required, is_committee_visible, audience)
-- SELECT id, 'Team Review & Approval', 'Review teams, approve, and send welcome and team assignment emails to participants',       3, 'selection',      TRUE,  TRUE, 'committee' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, approval_required, is_committee_visible, audience)
-- SELECT id, 'Mentor Assignment',      'Mentors are allocated to approved teams',                                                  4, 'custom',         TRUE,  TRUE, 'committee' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, approval_required, is_committee_visible, audience)
-- SELECT id, 'Build Phase',            'Teams work on developing their projects',                                                  5, 'custom',         FALSE, TRUE, 'committee' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, approval_required, is_committee_visible, audience)
-- SELECT id, 'Evaluation',             'Judges score each team via dedicated evaluator interface',                                 6, 'evaluation',     FALSE, TRUE, 'committee' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, approval_required, is_committee_visible, audience)
-- SELECT id, 'Final Result',           'Final results published and event closed',                                                 7, 'result',         FALSE, TRUE, 'committee' FROM events WHERE config_source = 'fixed' LIMIT 1;

-- Participant-facing stages
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, is_participant_visible, audience)
-- SELECT id, 'Team Connect',  'Connect with your teammates and get familiar with them', 1, 'custom',      TRUE, 'participant' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, is_participant_visible, audience)
-- SELECT id, 'Mentor Connect','Connect with your mentor',                                2, 'custom',      TRUE, 'participant' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, is_participant_visible, audience)
-- SELECT id, 'Build Phase',   'Build your project',                                      3, 'custom',      TRUE, 'participant' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, is_participant_visible, audience)
-- SELECT id, 'Submission',    'Submit your code, video and PPT before the deadline',     4, 'submission',  TRUE, 'participant' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, is_participant_visible, audience)
-- SELECT id, 'Evaluation',    'Projects are being reviewed and scored by evaluators',    5, 'evaluation',  TRUE, 'participant' FROM events WHERE config_source = 'fixed' LIMIT 1;
-- INSERT INTO stages (event_id, name, description, sequence_order, stage_type, is_participant_visible, audience)
-- SELECT id, 'Final Result',  'Rankings and winners announced',                          6, 'result',      TRUE, 'participant' FROM events WHERE config_source = 'fixed' LIMIT 1;

-- ============================================================
-- 8. WORKFLOW TEMPLATES
-- Reusable workflow blueprints for dynamic event types.
-- Defines stage sequence, stage types, visibility and configs.
--
-- Example:
-- Hackathon:
-- Registration -> Team Formation -> Evaluation
--
-- Coding Contest:
-- Registration -> Problem Release -> Submission -> Leaderboard
--
-- These templates are instantiated into event-specific workflows.
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_templates (
    id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT  NOT NULL,
    event_type    TEXT  NOT NULL,
    workflow_json JSONB NOT NULL DEFAULT '{}',
    created_by    INTEGER REFERENCES committee_members(id),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_event_type ON workflow_templates(event_type);


-- ============================================================
-- 8. EVENT WORKFLOWs

-- Runtime workflow instance assigned to an event.
--
-- Workflow Template:
--     Coding Contest Template
--
-- Event Workflow:
--     NITJ Coding Contest 2026
--
-- Tracks currently active stage and workflow execution state.
-- ============================================================
CREATE TABLE IF NOT EXISTS event_workflows (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id             UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    workflow_template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
    current_stage_id     UUID,   -- FK to stage_instances added after that table exists
    status               VARCHAR(20) NOT NULL DEFAULT 'active'
                         CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_event_workflow UNIQUE (event_id)  -- one workflow per event
);

CREATE INDEX IF NOT EXISTS idx_event_workflows_event ON event_workflows(event_id);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_workflows_current_stage'
    ) THEN
        ALTER TABLE event_workflows
            ADD CONSTRAINT fk_event_workflows_current_stage
                FOREIGN KEY (current_stage_id) REFERENCES stage_instances(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- 8. ENTITY STAGE STATUS
-- Entity Types:
-- participant
-- team
-- evaluator
--
-- Example:
--
-- Team Alpha
--     Registration = Complete
--     Submission = Pending
--
-- Participant John
--     Quiz Submission = Complete
--
-- Allows workflow engine to track progression
-- independently for each participant/team.
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_stage_state (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage_instance_id UUID NOT NULL REFERENCES stage_instances(id) ON DELETE CASCADE,
    entity_type   VARCHAR(30) NOT NULL
                  CHECK (entity_type IN ('participant', 'team')),
    entity_id     UUID NOT NULL,
    status        VARCHAR(30) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
    metadata      JSONB NOT NULL DEFAULT '{}',
    updated_at    TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_entity_stage UNIQUE (stage_instance_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_stage_state_event         ON entity_stage_state(event_id);
CREATE INDEX IF NOT EXISTS idx_entity_stage_state_stage         ON entity_stage_state(stage_instance_id);
CREATE INDEX IF NOT EXISTS idx_entity_stage_state_entity        ON entity_stage_state(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_stage_state_status        ON entity_stage_state(stage_instance_id, status);

-- ============================================================
-- 8. STAGE INSTANCES

--
-- Runtime execution records for workflow stages.
--
-- While workflow_templates define stage structure,
-- stage_instances track actual execution state
-- for a specific event.
--
-- Example:
-- Stage = Submission
-- Status = Active
-- Started = 2026-06-15 10:00
--
-- Used by orchestration engine to determine
-- current event progress.
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_instances (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage_id     UUID REFERENCES stages(id) ON DELETE SET NULL,
    stage_type   VARCHAR(50) NOT NULL DEFAULT 'custom'
                 CHECK (stage_type IN (
                     'registration', 'team_formation', 'submission',
                     'evaluation', 'selection', 'interview',
                     'public_voting', 'result', 'custom'
                 )),
    sequence_order INTEGER NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'upcoming'
                 CHECK (status IN ('upcoming', 'active', 'completed', 'skipped')),
    config       JSONB NOT NULL DEFAULT '{}',
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_instances_event       ON stage_instances(event_id);
CREATE INDEX IF NOT EXISTS idx_stage_instances_event_order ON stage_instances(event_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_stage_instances_status      ON stage_instances(event_id, status);

-- ============================================================
-- 8. EVENT COMMUNICATION CONFIG 
-- ============================================================
CREATE TABLE IF NOT EXISTS event_communication_config (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    trigger_type      VARCHAR(50) NOT NULL,
    stage_id          UUID        REFERENCES stages(id) ON DELETE CASCADE,
    enabled           BOOLEAN     DEFAULT TRUE,
    template_key      VARCHAR(100),
    send_offset_hours INTEGER,
    recipient_scope   VARCHAR(50) NOT NULL DEFAULT 'all_participants'
                      CHECK (recipient_scope IN (
                          'all_participants', 'active_teams', 'stage_teams',
                          'evaluators', 'committee', 'custom'
                      )),
    recipient_filter  JSONB       NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_event_comm_trigger UNIQUE (event_id, trigger_type, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_config_event ON event_communication_config(event_id);
CREATE INDEX IF NOT EXISTS idx_comm_config_stage ON event_communication_config(stage_id);

-- ============================================================
-- 8. STAGE TEAMS  (new table)
-- Tracks which teams are active/eliminated in each stage.
-- Required for any multi-round event format.
-- ============================================================
CREATE TABLE IF NOT EXISTS stage_teams (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id    UUID        NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id     UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'advanced', 'eliminated', 'withdrawn')),
    advanced_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_stage_team UNIQUE (stage_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_teams_stage   ON stage_teams(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_teams_event   ON stage_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_stage_teams_team    ON stage_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_stage_teams_status  ON stage_teams(stage_id, status);

-- ============================================================
-- 9. DISTRIBUTION RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS distribution_rules (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_size             INTEGER NOT NULL DEFAULT 3,
    max_per_institution   INTEGER DEFAULT 1,
    skill_balance         BOOLEAN DEFAULT TRUE,
    experience_mix        BOOLEAN DEFAULT TRUE,
    label                 TEXT NOT NULL,
    custom_constraints    JSONB,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Replaces the hackathon-specific boolean flags with a
-- generic rules blob the agent writes and the formation
-- service reads.
--
-- formation_mode:
--   algorithm    — system forms teams using rules
--   self_selected — participants form their own teams
--   pre_formed   — teams arrive already formed, just register
--   hybrid       — self-selected with algorithm fallback
--                  for unmatched participants
-- ============================================================
ALTER TABLE distribution_rules
    ADD COLUMN IF NOT EXISTS formation_mode VARCHAR(20) NOT NULL DEFAULT 'algorithm'
        CHECK (formation_mode IN ('algorithm', 'self_selected', 'pre_formed', 'hybrid')),
    ADD COLUMN IF NOT EXISTS rules JSONB NOT NULL DEFAULT '{}';

-- rules shape (written by config_agent commit, read by formation service):
-- {
--   "team_size":            { "min": 3, "max": 5 },
--   "max_per_institution":  1,
--   "balance_by":           ["skill_tags", "experience_level"],
--   "exclude_pairs":        [],           -- participant IDs that must not be on same team
--   "require_together":     [],           -- participant IDs that must be on same team
--   "custom_constraints":   []            -- free-form agent-extracted constraints
-- }


-- ============================================================
-- 10. EVALUATORS
-- ============================================================
-- CREATE TABLE evaluators (
--     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
--     name            VARCHAR(150) NOT NULL,
--     email           VARCHAR(255) UNIQUE NOT NULL,
--     weight          NUMERIC(3,2) DEFAULT 1.00,
--     access_token    VARCHAR(512) UNIQUE,          
--     created_at      TIMESTAMPTZ DEFAULT NOW()
-- );

CREATE TABLE IF NOT EXISTS evaluators (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id             UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name                 VARCHAR(150) NOT NULL,
    email                VARCHAR(255) NOT NULL UNIQUE,
    weight               NUMERIC(3, 2) DEFAULT 1.00,
    access_token         VARCHAR(512) UNIQUE,
    institution          VARCHAR(255),
    domain               VARCHAR(100),
    skill_tags           TEXT[]      DEFAULT ARRAY[]::TEXT[],
    experience_level     VARCHAR(20) DEFAULT 'intermediate'
                         CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    preferred_categories TEXT[]      DEFAULT ARRAY[]::TEXT[],
    availability         JSONB       DEFAULT '{}',
    max_workload         INTEGER     DEFAULT 3,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluators_access_token ON evaluators(access_token);
CREATE INDEX IF NOT EXISTS idx_evaluators_event        ON evaluators(event_id);

ALTER TABLE evaluators
    DROP CONSTRAINT IF EXISTS evaluators_email_key;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_evaluator_event_email'
    ) THEN
        ALTER TABLE evaluators 
            ADD CONSTRAINT uq_evaluator_event_email UNIQUE (event_id, email);
    END IF;
END $$;

-- ============================================================
-- 11. EVALUATOR ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluator_assignments (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    evaluator_id        UUID    NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
    team_id             UUID    NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    compatibility_score NUMERIC(5, 2) DEFAULT 0.00,
    reasoning           TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_evaluator_team_assignment UNIQUE (evaluator_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_evaluator ON evaluator_assignments(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_team      ON evaluator_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_event     ON evaluator_assignments(event_id);

-- =====================================================================
-- 12. EVALUATION SCHEDULES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS evaluation_schedules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id         UUID NOT NULL,
    assignment_id    UUID NOT NULL,

    room             VARCHAR(100) NOT NULL,
    time_slot        VARCHAR(100) NOT NULL,
    sequence_order   INTEGER DEFAULT 0,

    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_evaluation_schedules_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_schedules_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES evaluator_assignments(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_schedule_assignment
        UNIQUE (assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_schedules_event ON evaluation_schedules(event_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_schedules_room  ON evaluation_schedules(room);


-- ============================================================
-- 13. SCORES
-- ============================================================
-- CREATE TABLE scores (
--     id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
--     evaluator_id        UUID NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
--     score_value         NUMERIC(4,2) NOT NULL CHECK (score_value BETWEEN 0 AND 10),
--     criteria_breakdown  JSONB DEFAULT '{}',
--     notes               TEXT,
--     flagged             BOOLEAN DEFAULT FALSE,
--     submitted_at        TIMESTAMPTZ DEFAULT NOW(),
--     feedback_structured      JSONB DEFAULT '{}'::jsonb,
--     ai_consistency_flag      BOOLEAN DEFAULT FALSE,
--     ai_consistency_note      TEXT,
--     evaluation_duration_mins INTEGER DEFAULT 0
--     UNIQUE (team_id, evaluator_id)
-- );

-- stage_id added: required for multi-round events where the same team is
-- scored against different rubrics in different rounds.
-- anomaly.py and team_scores.py should read event_scoring_config for
-- thresholds and aggregation method; fall back to constants for MVP events.
CREATE TABLE IF NOT EXISTS scores (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id                 UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    evaluator_id            UUID        NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
    stage_id                UUID        REFERENCES stages(id) ON DELETE CASCADE,
    -- stage_id nullable so existing MVP rows don't break; new rows should always provide it.

    score_value             NUMERIC(4, 2) NOT NULL, --CHECK (score_value BETWEEN 0 AND 10),
    criteria_breakdown      JSONB       DEFAULT '{}',
    notes                   TEXT,
    flagged                 BOOLEAN     DEFAULT FALSE,

    feedback_structured     JSONB       DEFAULT '{}',
    ai_consistency_flag     BOOLEAN     DEFAULT FALSE,
    ai_consistency_note     TEXT,
    evaluation_duration_mins INTEGER    DEFAULT 0,

    submitted_at            TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_score_team_evaluator_stage UNIQUE (team_id, evaluator_id, stage_id)
    -- Replaces the old UNIQUE(team_id, evaluator_id) — now allows one score per stage per evaluator.
);

CREATE INDEX IF NOT EXISTS idx_scores_team      ON scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_evaluator ON scores(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_scores_stage     ON scores(stage_id);
CREATE INDEX IF NOT EXISTS idx_scores_flagged   ON scores(flagged);

-- event_scoring_config.score_scale_min/max defines the real
-- range per event. A competition using 0–100 breaks this check.
-- Range validation moves to the scoring service layer.
-- ============================================================
-- ALTER TABLE scores
--     DROP CONSTRAINT IF EXISTS scores_score_value_check;

-- Re-add a loose sanity check only (prevents obviously bad data
-- like negatives or absurdly large values from slipping in).
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'scores_score_value_sanity'
    ) THEN
        ALTER TABLE scores
            ADD CONSTRAINT scores_score_value_sanity
                CHECK (score_value >= 0 AND score_value <= 1000);
    END IF;
END $$;


-- ============================================================
-- 14. JUDGING CRITERIA
-- ============================================================
-- Already stage-scoped via stage_id. Supports per-stage rubrics out of the box
-- (different weights for PPT round vs final presentation round, etc.).
-- For dynamic events, the agent writes these rows during commit.
CREATE TABLE IF NOT EXISTS judging_criteria (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage_id    UUID        REFERENCES stages(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    weight      NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    max_score   NUMERIC(4, 2) DEFAULT 10.0,
    guidance    TEXT,
    sort_order  INTEGER     DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judging_criteria_event ON judging_criteria(event_id);
CREATE INDEX IF NOT EXISTS idx_judging_criteria_stage ON judging_criteria(stage_id);


-- ============================================================
-- 15. EVENT SCORING CONFIG  (dynamic events only)
-- ============================================================
-- Consolidates all scoring rules in one place.
-- anomaly.py: read anomaly_threshold_pct instead of hardcoded 0.2
-- team_scores.py: read aggregation_method instead of hardcoded 'weighted_average'
-- MVP events have no row here → services fall back to their existing constants.
CREATE TABLE IF NOT EXISTS event_scoring_config (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID        NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    score_scale_min         NUMERIC(5, 2) DEFAULT 0,
    score_scale_max         NUMERIC(5, 2) DEFAULT 10,
    aggregation_method      VARCHAR(30) DEFAULT 'weighted_average'
                            CHECK (aggregation_method IN ('average', 'weighted_average', 'trimmed_mean')),
    trimmed_mean_pct        NUMERIC(4, 2) DEFAULT 10.0,
    anomaly_threshold_pct   NUMERIC(5, 2) DEFAULT 20.0,
    judges_per_team         INTEGER     DEFAULT 2,
    total_judges            INTEGER,
    judge_selection         VARCHAR(30) DEFAULT 'expertise_based'
                            CHECK (judge_selection IN ('random', 'expertise_based', 'manual')),
    judge_overlap           VARCHAR(30) DEFAULT 'single_stage'
                            CHECK (judge_overlap IN ('all_stages', 'single_stage')),
    qualitative_feedback    BOOLEAN     DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_config_event ON event_scoring_config(event_id);


-- =====================================================================
-- 16. SCORE ANOMALIES TABLE
-- =====================================================================

-- CREATE TABLE IF NOT EXISTS score_anomalies (
--     id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     event_id             UUID NOT NULL,
--     team_id              UUID NOT NULL,
--     severity             VARCHAR NOT NULL,
--     divergence_score     DOUBLE PRECISION NOT NULL,
--     ai_reasoning         VARCHAR,
--     resolution_status    VARCHAR DEFAULT 'unresolved',
--     resolution_action    VARCHAR,
--     committee_note       VARCHAR,
--     resolved_at          TIMESTAMPTZ,
--     created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

--     CONSTRAINT fk_score_anomalies_team
--         FOREIGN KEY (team_id)
--         REFERENCES finalized_teams(id)
--         ON DELETE CASCADE
-- );

CREATE TABLE IF NOT EXISTS score_anomalies (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id             UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    severity            VARCHAR(20) DEFAULT 'medium'
                        CHECK (severity IN ('low', 'medium', 'high')),
    divergence_score    NUMERIC(5, 2) NOT NULL,
    ai_reasoning        TEXT,
    resolution_status   VARCHAR(20) DEFAULT 'pending'
                        CHECK (resolution_status IN ('pending', 'resolved', 'escalated')),
    resolution_action   VARCHAR(50),
    committee_note      TEXT,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_anomalies_event  ON score_anomalies(event_id);
CREATE INDEX IF NOT EXISTS idx_score_anomalies_team   ON score_anomalies(team_id);
CREATE INDEX IF NOT EXISTS idx_score_anomalies_status ON score_anomalies(resolution_status);

-- ============================================================
-- 17. APPROVAL GATES
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_gates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage_id        UUID REFERENCES stages(id),
    gate_type       VARCHAR(100) NOT NULL,
    action_payload  JSONB,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by     INTEGER REFERENCES committee_members(id),
    committee_note  TEXT,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_gates_status  ON approval_gates(status);
CREATE INDEX IF NOT EXISTS idx_approval_gates_event   ON approval_gates(event_id);

-- ======================================================================
-- 18. SUBMISSIONS (for submission of files in participant dashboard)
-- ======================================================================
-- CREATE TABLE IF NOT EXISTS submissions (
--     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
--     stage_id        UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
--     team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
--     participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

--     ppt_url         TEXT,
--     github_url      TEXT,
--     demo_video_url  TEXT,
--     notes           TEXT,
--     status          VARCHAR(20) DEFAULT 'submitted'
--                     CHECK (status IN ('submitted', 'reviewed', 'accepted', 'rejected')),

--     submitted_at    TIMESTAMPTZ DEFAULT NOW(),
--     updated_at      TIMESTAMPTZ DEFAULT NOW(),

--     -- Prevent duplicate submissions per team per stage
--     CONSTRAINT uq_team_stage_submission UNIQUE (team_id, stage_id)
-- );

-- pdf_url added for case competitions and similar formats.
-- validation_status tracks whether the submission passes stage.config constraints
-- (page limits, file type restrictions) — used by the agent pipeline.
-- MVP events: validation_status stays 'pending' (no constraint checking).
CREATE TABLE IF NOT EXISTS submissions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage_id            UUID        NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    team_id             UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    participant_id      UUID        NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

    ppt_url             TEXT,
    github_url          TEXT,
    demo_video_url      TEXT,
    pdf_url             TEXT,

    notes               TEXT,
    status              VARCHAR(20) DEFAULT 'submitted'
                        CHECK (status IN ('submitted', 'reviewed', 'accepted', 'rejected')),

    -- Dynamic: checked against stage.config.constraints (page limits, formats, etc.)
    validation_status   VARCHAR(20) DEFAULT 'pending'
                        CHECK (validation_status IN ('pending', 'valid', 'invalid')),
    validation_errors   JSONB       DEFAULT '[]',

    submitted_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_team_stage_submission UNIQUE (team_id, stage_id)
);

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS submission_type    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS submission_payload JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_submissions_team_stage  ON submissions(team_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_submissions_event       ON submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(participant_id);

-- generic files JSONB array + make team/participant optional
-- so solo-participant events work.
--
-- files shape:
-- [
--   { "type": "deck",    "url": "...", "label": "Slide Deck" },
--   { "type": "report",  "url": "...", "label": "Executive Summary" },
--   { "type": "video",   "url": "...", "label": "Demo Video" },
--   { "type": "github",  "url": "...", "label": "Code Repository" }
-- ]
--
-- The agent writes allowed file types into stage.config.submission_format;
-- the portal reads that to show the right upload fields.
-- ============================================================
ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS files JSONB NOT NULL DEFAULT '[]';

-- Make team_id and participant_id both nullable so either
-- team-based or individual submissions work.
ALTER TABLE submissions
    ALTER COLUMN team_id        DROP NOT NULL,
    ALTER COLUMN participant_id DROP NOT NULL;

-- Ensure at least one of team_id / participant_id is always set.
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_submission_owner'
    ) THEN
        ALTER TABLE submissions
            ADD CONSTRAINT chk_submission_owner
                CHECK (team_id IS NOT NULL OR participant_id IS NOT NULL);
    END IF;
END $$;

-- Keep the old URL columns for MVP backward compat — they stay
-- nullable and are ignored for dynamic events. New events write
-- to files JSONB only.
-- (No drop — existing MVP rows still have data there.)

-- =====================================================================
-- 19. FINALIZED TEAMS (Immutable snapshot of approved teams)
-- =====================================================================
-- CREATE TABLE IF NOT EXISTS finalized_teams (
--     id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     event_id                   UUID NOT NULL,
--     team_id                    UUID NOT NULL UNIQUE,
--     name                       VARCHAR NOT NULL,
--     challenge                  VARCHAR,
--     llm_rationale              VARCHAR,
--     members_snapshot           JSON NOT NULL,
    
--     -- Mentor Columns
--     mentor_name                VARCHAR,
--     mentor_company             VARCHAR,
--     mentor_email               VARCHAR,
    
--     -- Judge Scoring & Anomaly Tracking
--     scores_snapshot            JSON,
--     final_calculated_total     DOUBLE PRECISION DEFAULT 0.0,
--     panel_average_innovation   DOUBLE PRECISION,
--     panel_average_code         DOUBLE PRECISION,
--     panel_average_presentation DOUBLE PRECISION,
--     panel_average_impact       DOUBLE PRECISION,
    
--     has_active_anomaly         BOOLEAN DEFAULT FALSE NOT NULL,
--     anomaly_details            JSON,
--     is_corrected               BOOLEAN DEFAULT FALSE NOT NULL,
--     correction_note            VARCHAR,
    
--     created_at                 TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--     updated_at                 TIMESTAMPTZ DEFAULT NOW() NOT NULL
-- );


-- panel_averages JSONB replaces the 4 hardcoded hackathon-specific columns.
-- Old columns kept for MVP compatibility — new dynamic events populate panel_averages.
-- Example: {"innovation": 8.2, "feasibility": 7.5, "presentation": 9.0}
-- Keys are derived dynamically from the judging_criteria rows for that event's evaluation stage.
CREATE TABLE IF NOT EXISTS finalized_teams (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id                     UUID        NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    name                        VARCHAR     NOT NULL,
    challenge                   VARCHAR,
    llm_rationale               VARCHAR,
    members_snapshot            JSON        NOT NULL,

    mentor_name                 VARCHAR,
    mentor_company              VARCHAR,
    mentor_email                VARCHAR,

    scores_snapshot             JSON,
    final_calculated_total      DOUBLE PRECISION DEFAULT 0.0,

    -- MVP: these four columns remain for the fixed hackathon dashboard
    panel_average_innovation    DOUBLE PRECISION,
    panel_average_code          DOUBLE PRECISION,
    panel_average_presentation  DOUBLE PRECISION,
    panel_average_impact        DOUBLE PRECISION,

    -- Dynamic: keyed by criterion name from judging_criteria for this event
    panel_averages              JSON,

    has_active_anomaly          BOOLEAN     DEFAULT FALSE NOT NULL,
    anomaly_details             JSON,
    is_corrected                BOOLEAN     DEFAULT FALSE NOT NULL,
    correction_note             VARCHAR,

    created_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_finalized_teams_event ON finalized_teams(event_id);



-- ============================================================
-- 20. COMMUNICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS communications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    recipient_type  VARCHAR(20) CHECK (recipient_type IN ('participant', 'evaluator', 'committee', 'all')),
    recipient_id    UUID,
    recipient_email VARCHAR(255) NOT NULL,
    subject         TEXT NOT NULL,
    body            TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft', 'approved', 'sent', 'failed')),
    resend_id       TEXT,
    failure_reason  TEXT,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communications_status    ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_recipient ON communications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_communications_event     ON communications(event_id);


-- =====================================================================
-- 21. DELIVERY LOGS (Email delivery tracking)
-- =====================================================================
CREATE TABLE IF NOT EXISTS delivery_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL,
    recipient_name  VARCHAR NOT NULL,
    recipient_email VARCHAR NOT NULL,
    stage           VARCHAR DEFAULT NULL,
    status          VARCHAR DEFAULT 'Pending',
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    opened          VARCHAR DEFAULT 'No'
);

-- The old default 'Welcome & Registration Confirmation' is a
-- hackathon artifact. NULL is the right default for a generic
-- system; the service writes the actual stage name.
-- ============================================================
-- ALTER TABLE delivery_logs
--     ALTER COLUMN stage SET DEFAULT NULL;

-- Also update existing rows that have the hardcoded default
-- so they don't pollute analytics queries.
-- UPDATE delivery_logs
--     SET stage = NULL
--     WHERE stage = 'Welcome & Registration Confirmation';

-- ============================================================
-- 22. ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action      VARCHAR(255) NOT NULL,
    actor       VARCHAR(50) DEFAULT 'system',
    meta        JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_event ON activity_log(event_id, created_at DESC);


-- ============================================================
-- 23. ISSUED TOKENS (magic links for evaluators & participants)
-- ============================================================
CREATE TABLE IF NOT EXISTS issued_tokens (
    id               SERIAL PRIMARY KEY,
    jti              VARCHAR(100) UNIQUE NOT NULL,
    recipient_email  VARCHAR(255),
    role             VARCHAR(20) NOT NULL,
    submission_id    VARCHAR(36),
    team_id          VARCHAR(36),
    expires_at       TIMESTAMPTZ NOT NULL,
    revoked          BOOLEAN DEFAULT FALSE,
    revoked_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);


CREATE UNIQUE INDEX IF NOT EXISTS idx_issued_tokens_jti  ON issued_tokens(jti);
CREATE INDEX        IF NOT EXISTS idx_issued_tokens_role ON issued_tokens(role);

-- ============================================================
-- 24. CHALLENGES
-- ============================================================
CREATE TABLE IF NOT EXISTS challenges (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    description     TEXT    NOT NULL,
    scope           TEXT,
    constraints     TEXT,
    data_sources    TEXT,
    expected_output TEXT,
    tags            TEXT[],
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_event_id ON challenges(event_id);

-- Add FK from teams to challenges (deferred until challenges table exists)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_teams_challenge'
    ) THEN
        ALTER TABLE teams ADD CONSTRAINT fk_teams_challenge
            FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE SET NULL;
    END IF;
END $$;



-- ============================================
-- 25. ANNOUNCEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS announcements (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    message          TEXT NOT NULL,
    type             VARCHAR(20) DEFAULT 'info',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 26. BROADCASTS
-- ============================================================

CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    title VARCHAR NOT NULL,
    body VARCHAR NOT NULL,
    type VARCHAR DEFAULT 'info',
    scope VARCHAR DEFAULT 'All Participants',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_broadcasts_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_event_id
ON broadcasts(event_id);


-- ============================================================
-- 27. EVENT FAQS
-- ============================================================
CREATE TABLE IF NOT EXISTS event_faqs (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category    VARCHAR(100),
    question    TEXT    NOT NULL,
    answer      TEXT    NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_faqs_event_id ON event_faqs(event_id);

-- ============================================================
-- 28. EVENT VENUES
-- ============================================================
CREATE TABLE IF NOT EXISTS event_venues (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID    NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    address         TEXT,
    floor           VARCHAR(100),
    room_map_url    TEXT,
    parking_info    TEXT,
    wifi_ssid       VARCHAR(200),
    wifi_password   VARCHAR(200),
    check_in_info   TEXT,
    contact_name    VARCHAR(200),
    contact_phone   VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 29. MENTOR SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS mentor_sessions (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID    NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_id        UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_mins   INTEGER DEFAULT 60,
    status          VARCHAR(20) DEFAULT 'scheduled',
    shared_notes    TEXT,
    mentor_notes    TEXT,
    action_items    JSONB   DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_sessions_team_id ON mentor_sessions(team_id);

-- ============================================================
-- 30. TEAM STAGE CHECKLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS team_stage_checklist (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID    NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    stage_id        UUID    NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    event_id        UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    item_key        VARCHAR(100) NOT NULL,
    label           TEXT    NOT NULL,
    is_complete     BOOLEAN DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,
    notes           TEXT,

    CONSTRAINT uq_team_stage_checklist_item UNIQUE (team_id, stage_id, item_key)
);


-- ============================================================
-- 31. PARTICIPANT NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS participant_notifications (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id  UUID    NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    event_id        UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    body            TEXT    NOT NULL,
    type            VARCHAR(50),
    link_url        TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participant_notifications_participant ON participant_notifications(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_notifications_unread      ON participant_notifications(participant_id, is_read, created_at DESC);

-- ============================================================
-- 32. AI CONVERSATIONS  (participant chatbot)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id  UUID    NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    event_id        UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    session_token   VARCHAR(255) UNIQUE NOT NULL,
    messages        JSONB   DEFAULT '[]',
    message_count   INTEGER DEFAULT 0,
    last_active     TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);




-- ============================================================
-- 33. AI QUERY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_query_log (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id  UUID    NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    question        TEXT    NOT NULL,
    response        TEXT,
    tokens_used     INTEGER,
    latency_ms      INTEGER,
    retrieval_used  BOOLEAN DEFAULT FALSE,
    session_token   VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_query_log_event_participant ON ai_query_log(event_id, participant_id, created_at DESC);


-- =====================================================================
-- 34. AI INSIGHTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_insights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id        UUID NOT NULL,
    team_id         UUID NOT NULL,

    insight_type    VARCHAR(50) NOT NULL,
    content         JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ai_insights_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ai_insights_team
        FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_event ON ai_insights(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_team  ON ai_insights(team_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type  ON ai_insights(insight_type);



-- ============================================================
-- 35. GRIEVANCES
-- ============================================================

CREATE TABLE IF NOT EXISTS grievances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL,

    team_id UUID NOT NULL,
    team_name VARCHAR NOT NULL,

    participant_id UUID NOT NULL,
    participant_name VARCHAR NOT NULL,

    category VARCHAR NOT NULL,
    detail TEXT NOT NULL,

    severity VARCHAR NOT NULL DEFAULT 'medium',

    status VARCHAR NOT NULL DEFAULT 'pending',

    resolution_note VARCHAR,
    ai_drafted_reply TEXT,

    is_clicked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_grievances_team
        FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_grievances_participant
        FOREIGN KEY (participant_id)
        REFERENCES participants(id)
        ON DELETE CASCADE
);

-- Indexes created by index=True
CREATE INDEX IF NOT EXISTS idx_grievances_event_id
ON grievances(event_id);

CREATE INDEX IF NOT EXISTS idx_grievances_team_id
ON grievances(team_id);

CREATE INDEX IF NOT EXISTS idx_grievances_participant_id
ON grievances(participant_id);

-- ============================================================
-- 36. EVENT KNOWLEDGE ENTRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS event_knowledge_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_knowledge_entries_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_knowledge_entries_event_id
ON event_knowledge_entries(event_id);



-- ============================================================
-- 37. EVENT KNOWLEDGE VECTORS
-- ============================================================

CREATE TABLE IF NOT EXISTS event_knowledge_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    content_chunk TEXT NOT NULL,
    embedding JSONB,
    visibility VARCHAR(20) DEFAULT 'participant',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_ekv_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
);

-- Index created by index=True
CREATE INDEX IF NOT EXISTS idx_event_knowledge_vectors_event_id
ON event_knowledge_vectors(event_id);

-- Composite index from __table_args__
CREATE INDEX IF NOT EXISTS idx_ekv_event_visibility
ON event_knowledge_vectors(event_id, visibility);


-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_team_members_team        ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_participant ON team_members(participant_id);
CREATE INDEX IF NOT EXISTS idx_scores_team              ON scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_evaluator         ON scores(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_scores_flagged           ON scores(flagged);
CREATE INDEX IF NOT EXISTS idx_approval_gates_status    ON approval_gates(status);
CREATE INDEX IF NOT EXISTS idx_communications_status    ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_recipient ON communications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_activity_log_event       ON activity_log(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_portal_token ON participants(portal_token);
CREATE INDEX IF NOT EXISTS idx_evaluators_access_token  ON evaluators(access_token);
CREATE INDEX IF NOT EXISTS idx_stages_event_order       ON stages(event_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_teams_event_id           ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_teams_approval_status    ON teams(approval_status);
CREATE INDEX IF NOT EXISTS idx_teams_evaluation_status  ON teams(evaluation_status);
CREATE INDEX IF NOT EXISTS idx_teams_progression_status ON teams(progression_status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id     ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_participant_id ON team_members(participant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_leader   ON team_members(is_leader);
CREATE INDEX IF NOT EXISTS idx_submissions_team_stage  ON submissions(team_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_submissions_event       ON submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(participant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_committee_email    ON committee_members(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_issued_tokens_jti  ON issued_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_issued_tokens_role ON issued_tokens(role);