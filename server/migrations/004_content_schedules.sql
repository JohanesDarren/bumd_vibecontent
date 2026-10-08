-- Content publishing calendar entries (Penjadwalan Konten).
CREATE TABLE IF NOT EXISTS content_schedules (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  draft_id text REFERENCES content_drafts(id) ON DELETE SET NULL,
  title text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram','facebook','twitter','linkedin','youtube')),
  status text NOT NULL CHECK (status IN ('draft','scheduled','published')),
  publish_date date NOT NULL,
  publish_time time NOT NULL DEFAULT '09:00',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_schedules_org_date_idx ON content_schedules(organization_id,publish_date);
