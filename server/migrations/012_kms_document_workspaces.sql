CREATE TABLE IF NOT EXISTS kms_document_workspaces (
  document_id text NOT NULL REFERENCES kms_documents(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  PRIMARY KEY(document_id, workspace_id)
);
CREATE INDEX IF NOT EXISTS kms_document_workspaces_lookup_idx ON kms_document_workspaces(workspace_id,document_id);
INSERT INTO kms_document_workspaces(document_id,workspace_id) SELECT id,workspace_id FROM kms_documents ON CONFLICT DO NOTHING;
INSERT INTO schema_migrations(name) VALUES ('012_kms_document_workspaces') ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION enforce_kms_workspace_company() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT company_id FROM kms_documents WHERE id=NEW.document_id) IS DISTINCT FROM
    (SELECT company_id FROM organizations WHERE id=NEW.workspace_id) THEN
   RAISE EXCEPTION 'KMS document workspace belongs to another company';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kms_workspace_company_guard ON kms_document_workspaces;
CREATE TRIGGER kms_workspace_company_guard BEFORE INSERT OR UPDATE ON kms_document_workspaces
  FOR EACH ROW EXECUTE FUNCTION enforce_kms_workspace_company();
