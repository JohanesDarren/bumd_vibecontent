-- Knowledge base becomes COMPANY-scoped: every workspace of a company shares one KB
-- (RAG retrieval is always scoped to a single knowledge base, so a company's own
-- documents must live together). organization_id keeps recording the workspace that
-- owns a document (attribution), while company_id is the retrieval/isolation key.

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS company_id text REFERENCES companies(id) ON DELETE CASCADE;

-- Backfill: a document inherits the company of the workspace it was created in.
UPDATE knowledge_sources s
   SET company_id = o.company_id
  FROM organizations o
 WHERE o.id = s.organization_id
   AND s.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_company ON knowledge_sources(company_id);

INSERT INTO schema_migrations(name) VALUES ('008_knowledge_company_scope') ON CONFLICT DO NOTHING;
