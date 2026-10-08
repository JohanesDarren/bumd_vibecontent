-- Preserve existing memberships; former reviewers retain accounts as creators.
UPDATE memberships SET role = 'creator' WHERE role = 'reviewer';
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check CHECK (role IN ('creator', 'admin'));
INSERT INTO schema_migrations(name) VALUES ('003_remove_reviewer_role') ON CONFLICT DO NOTHING;
