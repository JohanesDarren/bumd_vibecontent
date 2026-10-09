-- Company-owned settings and explicit per-workspace KB assignments.
CREATE TABLE IF NOT EXISTS company_settings (
  company_id text PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Preserve the most recently edited workspace settings as the company's initial settings.
INSERT INTO company_settings(company_id, data, updated_at)
SELECT DISTINCT ON (o.company_id) o.company_id, ws.data, ws.updated_at
  FROM workspace_settings ws
  JOIN organizations o ON o.id = ws.organization_id
 WHERE o.company_id IS NOT NULL
 ORDER BY o.company_id, ws.updated_at DESC
ON CONFLICT (company_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS knowledge_source_workspaces (
  source_id text NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, workspace_id)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_source_workspaces_workspace
  ON knowledge_source_workspaces(workspace_id, enabled);

-- Before this migration, company knowledge was visible to every workspace in that company.
-- Preserve that behavior for all existing sources, including inactive sources (whose global
-- source status continues to prevent indexing).
INSERT INTO knowledge_source_workspaces(source_id, workspace_id, enabled)
SELECT s.id, o.id, true
  FROM knowledge_sources s
  JOIN organizations source_org ON source_org.id = s.organization_id
  JOIN organizations o ON o.company_id = source_org.company_id
 WHERE source_org.company_id IS NOT NULL
ON CONFLICT (source_id, workspace_id) DO NOTHING;

INSERT INTO schema_migrations(name)
VALUES ('009_company_settings_workspace_knowledge')
ON CONFLICT DO NOTHING;
