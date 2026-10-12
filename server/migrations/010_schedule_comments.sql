CREATE TABLE IF NOT EXISTS schedule_comments (
  id text PRIMARY KEY,
  schedule_id text NOT NULL REFERENCES content_schedules(id) ON DELETE CASCADE,
  author_id text REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('corporate','superadmin')),
  text text NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedule_comments_schedule_created_idx ON schedule_comments(schedule_id, created_at);
INSERT INTO schema_migrations(name) VALUES ('010_schedule_comments') ON CONFLICT DO NOTHING;

