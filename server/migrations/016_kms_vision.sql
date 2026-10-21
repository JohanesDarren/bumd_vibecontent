ALTER TABLE kms_documents ADD COLUMN IF NOT EXISTS vision_description text;
ALTER TABLE kms_documents ADD COLUMN IF NOT EXISTS vision_model text;
ALTER TABLE kms_documents ADD COLUMN IF NOT EXISTS vision_updated_at timestamptz;
INSERT INTO schema_migrations(name) VALUES ('016_kms_vision') ON CONFLICT DO NOTHING;
