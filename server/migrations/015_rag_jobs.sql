CREATE TABLE IF NOT EXISTS rag_jobs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','done','error')),
  answer jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rag_jobs_created_idx ON rag_jobs(created_at);
INSERT INTO schema_migrations(name) VALUES ('015_rag_jobs') ON CONFLICT DO NOTHING;
