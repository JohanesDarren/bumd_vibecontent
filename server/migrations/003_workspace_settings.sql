-- Per-workspace application settings (grounding, privacy, default language).
-- One row per organization; data is a JSONB document mirroring AppSettings.
CREATE TABLE IF NOT EXISTS workspace_settings (
  organization_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
