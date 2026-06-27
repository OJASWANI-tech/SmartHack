-- Migration: 002_evaluator_extensions.sql
-- Adds tables and columns for evaluator dashboard, expertise matching, CP-SAT optimization, and score governance.

-- 1. Extend evaluators table with profile columns
ALTER TABLE evaluators ADD COLUMN IF NOT EXISTS institution VARCHAR(255);
ALTER TABLE evaluators ADD COLUMN IF NOT EXISTS domain VARCHAR(100);
ALTER TABLE evaluators ADD COLUMN IF NOT EXISTS skill_tags TEXT[] DEFAULT '{}';
ALTER TABLE evaluators ADD COLUMN IF NOT EXISTS experience_level VARCHAR(20) DEFAULT 'intermediate' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE evaluators ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] DEFAULT '{}';
ALTER TABLE evaluators ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}';
ALTER TABLE evaluators ADD COLUMN IF NOT EXISTS max_workload INT DEFAULT 3;
ALTER TABLE evaluators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Extend scores table with feedback and AI review columns
ALTER TABLE scores ADD COLUMN IF NOT EXISTS feedback_structured JSONB DEFAULT '{}';
ALTER TABLE scores ADD COLUMN IF NOT EXISTS ai_consistency_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS ai_consistency_note TEXT;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS evaluation_duration_mins INT DEFAULT 0;

-- 3. Create evaluator_assignments table
CREATE TABLE IF NOT EXISTS evaluator_assignments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    evaluator_id       UUID NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
    team_id            UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    compatibility_score NUMERIC(5, 2) DEFAULT 0.00,
    reasoning          TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_evaluator_team_assignment UNIQUE (evaluator_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_evaluator ON evaluator_assignments(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_team ON evaluator_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_event ON evaluator_assignments(event_id);

-- 4. Create evaluation_schedules table
CREATE TABLE IF NOT EXISTS evaluation_schedules (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    assignment_id      UUID NOT NULL REFERENCES evaluator_assignments(id) ON DELETE CASCADE,
    room               VARCHAR(100) NOT NULL,
    time_slot          VARCHAR(100) NOT NULL, -- e.g., "10:00 - 10:15"
    sequence_order     INT DEFAULT 0,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_schedule_assignment UNIQUE (assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_schedules_event ON evaluation_schedules(event_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_schedules_room ON evaluation_schedules(room);

-- 5. Create score_anomalies table
CREATE TABLE IF NOT EXISTS score_anomalies (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id            UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    severity           VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    divergence_score   NUMERIC(5, 2) NOT NULL,
    ai_reasoning       TEXT,
    resolution_status  VARCHAR(20) DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'escalated')),
    resolution_action  VARCHAR(50), -- e.g., 'override_average', 're_evaluation', 'accepted'
    committee_note     TEXT,
    resolved_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_anomalies_event ON score_anomalies(event_id);
CREATE INDEX IF NOT EXISTS idx_score_anomalies_team ON score_anomalies(team_id);
CREATE INDEX IF NOT EXISTS idx_score_anomalies_status ON score_anomalies(resolution_status);

-- 6. Create ai_insights table
CREATE TABLE IF NOT EXISTS ai_insights (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id            UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    insight_type       VARCHAR(50) NOT NULL, -- 'summary', 'rubric_hints', 'feedback'
    content            JSONB NOT NULL DEFAULT '{}',
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_event ON ai_insights(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_team ON ai_insights(team_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
