ALTER TABLE kms_documents ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'document';
ALTER TABLE kms_documents ADD COLUMN IF NOT EXISTS style_frame bytea;
INSERT INTO schema_migrations(name) VALUES ('013_kms_media') ON CONFLICT DO NOTHING;
