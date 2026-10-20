ALTER TABLE draft_citations ALTER COLUMN source_id DROP NOT NULL;
ALTER TABLE draft_citations ADD COLUMN IF NOT EXISTS kms_document_id text REFERENCES kms_documents(id) ON DELETE SET NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='draft_citations_one_source_type' AND conrelid='draft_citations'::regclass) THEN
    ALTER TABLE draft_citations ADD CONSTRAINT draft_citations_one_source_type CHECK (num_nonnulls(source_id,kms_document_id)<=1);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS draft_citations_kms_document_idx ON draft_citations(kms_document_id) WHERE kms_document_id IS NOT NULL;
INSERT INTO schema_migrations(name) VALUES ('014_draft_citations_kms') ON CONFLICT DO NOTHING;
