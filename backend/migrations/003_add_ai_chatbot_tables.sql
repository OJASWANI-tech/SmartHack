-- Migration: 003_add_ai_chatbot_tables.sql
-- Adds participant AI chatbot support tables and related metadata columns.

ALTER TABLE stages ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE stages ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '{}';
ALTER TABLE stages ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '{}';
ALTER TABLE stages ADD COLUMN IF NOT EXISTS submission_deadline TIMESTAMPTZ;
ALTER TABLE stages ADD COLUMN IF NOT EXISTS tips TEXT;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS challenge_id UUID;

CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    scope TEXT,
    constraints TEXT,
    data_sources TEXT,
    expected_output TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenges_event_id ON challenges(event_id);

CREATE TABLE IF NOT EXISTS event_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category VARCHAR(100),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_faqs_event_id ON event_faqs(event_id);

CREATE TABLE IF NOT EXISTS judging_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    weight NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    max_score NUMERIC(6, 2) DEFAULT 10.0,
    guidance TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_judging_criteria_event_id ON judging_criteria(event_id);

CREATE TABLE IF NOT EXISTS event_venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    floor VARCHAR(100),
    room_map_url TEXT,
    parking_info TEXT,
    wifi_ssid VARCHAR(200),
    wifi_password VARCHAR(200),
    check_in_info TEXT,
    contact_name VARCHAR(200),
    contact_phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_mins INT DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled',
    shared_notes TEXT,
    mentor_notes TEXT,
    action_items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_team_id ON mentor_sessions(team_id);

CREATE TABLE IF NOT EXISTS team_stage_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    item_key VARCHAR(100) NOT NULL,
    label TEXT NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    CONSTRAINT uq_team_stage_checklist_item UNIQUE (team_id, stage_id, item_key)
);

CREATE TABLE IF NOT EXISTS participant_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50),
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_participant_notifications_participant_id ON participant_notifications(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_notifications_unread ON participant_notifications(participant_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    messages JSONB DEFAULT '[]',
    message_count INT DEFAULT 0,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    response TEXT,
    tokens_used INT,
    latency_ms INT,
    retrieval_used BOOLEAN DEFAULT FALSE,
    session_token VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_query_log_event_participant_created ON ai_query_log(event_id, participant_id, created_at DESC);
