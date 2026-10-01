CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  sector text NOT NULL,
  city text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#0284c7',
  accent_color text NOT NULL DEFAULT '#0ea5e9',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  avatar text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('creator','reviewer','admin')),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS brand_profiles (
  organization_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  owner text NOT NULL,
  version text NOT NULL,
  effective_date text NOT NULL,
  status text NOT NULL CHECK (status IN ('aktif','menunggu_persetujuan','usang','gagal_diproses')),
  upload_date timestamptz NOT NULL DEFAULT now(),
  file_size text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS knowledge_sources_org_status_idx ON knowledge_sources(organization_id,status);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  section text NOT NULL,
  page integer,
  content text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS content_briefs (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by text NOT NULL REFERENCES users(id),
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_drafts (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brief_id text,
  title text NOT NULL,
  format text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','menunggu_review','revisi_diminta','disetujui','ditolak','diarsipkan')),
  current_version integer NOT NULL DEFAULT 1,
  created_by text NOT NULL REFERENCES users(id),
  creator_name text NOT NULL,
  visual_asset jsonb,
  approval_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_drafts_org_status_idx ON content_drafts(organization_id,status);

CREATE TABLE IF NOT EXISTS draft_versions (
  draft_id text NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content text NOT NULL,
  scenes jsonb,
  unsupported_claims jsonb NOT NULL DEFAULT '[]',
  quality_check jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  change_summary text NOT NULL DEFAULT '',
  PRIMARY KEY (draft_id, version_number)
);

CREATE TABLE IF NOT EXISTS draft_citations (
  id text PRIMARY KEY,
  draft_id text NOT NULL,
  version_number integer NOT NULL,
  source_id text NOT NULL REFERENCES knowledge_sources(id),
  data jsonb NOT NULL,
  FOREIGN KEY (draft_id, version_number) REFERENCES draft_versions(draft_id,version_number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_comments (
  id text PRIMARY KEY,
  draft_id text NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id),
  author_name text NOT NULL,
  author_role text NOT NULL,
  text text NOT NULL,
  target_snippet text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id text REFERENCES users(id),
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL,
  object_name text NOT NULL,
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_org_created_idx ON audit_events(organization_id,created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_events are append-only'; END $$;
DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
