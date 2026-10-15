CREATE TABLE IF NOT EXISTS kms_documents (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES companies(id),
  workspace_id text NOT NULL REFERENCES organizations(id),
  title text NOT NULL,
  category text NOT NULL,
  filename text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE kms_documents ADD COLUMN IF NOT EXISTS indexed boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS kms_documents_company_workspace_idx ON kms_documents(company_id,workspace_id);
INSERT INTO schema_migrations(name) VALUES ('011_kms_documents') ON CONFLICT DO NOTHING;
