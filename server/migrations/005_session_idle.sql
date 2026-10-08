-- Session idle timeout: track the last time a session was used so inactivity can
-- expire it before the absolute cap. Existing sessions are treated as freshly
-- active (DEFAULT now()) and will age out normally from here.
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
INSERT INTO schema_migrations(name) VALUES ('005_session_idle') ON CONFLICT DO NOTHING;
