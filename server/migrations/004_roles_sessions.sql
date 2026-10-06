CREATE TABLE IF NOT EXISTS companies (id text PRIMARY KEY, name text NOT NULL);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_id text REFERENCES companies(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_role text NOT NULL DEFAULT 'creator';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id text REFERENCES companies(id);
ALTER TABLE users ADD CONSTRAINT users_global_role_check CHECK (global_role IN ('creator','corporate','superadmin'));
-- One company per legacy administrator; unadministered workspaces receive their own company.
INSERT INTO companies(id,name)
SELECT DISTINCT ON (coalesce(a.user_id,o.id)) 'co-' || coalesce(a.user_id,o.id), o.name
FROM organizations o LEFT JOIN LATERAL (
 SELECT user_id FROM memberships WHERE organization_id=o.id AND role='admin' ORDER BY user_id LIMIT 1
) a ON true ORDER BY coalesce(a.user_id,o.id),o.created_at
ON CONFLICT DO NOTHING;
UPDATE organizations o SET company_id='co-' || coalesce(
 (SELECT user_id FROM memberships WHERE organization_id=o.id AND role='admin' ORDER BY user_id LIMIT 1),o.id)
WHERE company_id IS NULL;
ALTER TABLE organizations ALTER COLUMN company_id SET NOT NULL;
UPDATE users u SET global_role='corporate',company_id=(
 SELECT o.company_id FROM memberships m JOIN organizations o ON o.id=m.organization_id
 WHERE m.user_id=u.id AND m.role='admin' ORDER BY o.created_at LIMIT 1
) WHERE EXISTS (SELECT 1 FROM memberships WHERE user_id=u.id AND role='admin') AND global_role='creator';
UPDATE memberships SET role='creator' WHERE role='admin';
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check CHECK (role='creator');
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
INSERT INTO schema_migrations(name) VALUES ('004_roles_sessions') ON CONFLICT DO NOTHING;
