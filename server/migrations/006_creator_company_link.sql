-- A creator's company is stored twice: users.company_id and
-- memberships -> organizations.company_id. Historically the admin flow could
-- create a membership without stamping users.company_id (and an admin user edit
-- could null it out), which made creators vanish from the corporate screen that
-- filters by company. Backfill the missing links, then keep them in sync with a
-- trigger so the two representations can never drift again.

-- 1. Backfill: a creator whose active memberships all point at one company
--    clearly belongs to that company.
UPDATE users u
   SET company_id = x.cid
  FROM (
    SELECT m.user_id, min(o.company_id) AS cid, count(DISTINCT o.company_id) AS n
      FROM memberships m
      JOIN organizations o ON o.id = m.organization_id
     WHERE m.active AND o.company_id IS NOT NULL
     GROUP BY m.user_id
  ) x
 WHERE u.id = x.user_id
   AND x.n = 1
   AND u.global_role = 'creator'
   AND u.company_id IS NULL;

-- 2. Keep them in sync: whenever a creator is put into a workspace, stamp the
--    owning company onto the user if they don't already have one.
CREATE OR REPLACE FUNCTION sync_creator_company() RETURNS trigger AS $$
BEGIN
  IF NEW.active THEN
    UPDATE users u
       SET company_id = o.company_id
      FROM organizations o
     WHERE o.id = NEW.organization_id
       AND u.id = NEW.user_id
       AND u.global_role = 'creator'
       AND u.company_id IS NULL
       AND o.company_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_creator_company ON memberships;
CREATE TRIGGER trg_sync_creator_company
  AFTER INSERT OR UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION sync_creator_company();

INSERT INTO schema_migrations(name) VALUES ('006_creator_company_link') ON CONFLICT DO NOTHING;
