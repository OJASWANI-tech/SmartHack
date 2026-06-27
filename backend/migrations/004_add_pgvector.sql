-- Migration: 004_add_pgvector.sql
-- Enables pgvector and creates the event knowledge vector store.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS event_knowledge_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    chunk_index INT DEFAULT 0,
    content_chunk TEXT NOT NULL,
    embedding vector(768),
    visibility VARCHAR(20) DEFAULT 'participant',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_knowledge_vectors_event_id ON event_knowledge_vectors(event_id);
CREATE INDEX IF NOT EXISTS idx_ekv_event_visibility ON event_knowledge_vectors(event_id, visibility);
CREATE INDEX IF NOT EXISTS idx_ekv_embedding ON event_knowledge_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
