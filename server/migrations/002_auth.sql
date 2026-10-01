ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';

INSERT INTO schema_migrations(name) VALUES ('002_auth') ON CONFLICT DO NOTHING;
