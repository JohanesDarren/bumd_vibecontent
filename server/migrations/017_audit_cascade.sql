-- audit_events is append-only, but its FK to organizations cascades on delete.
-- The blanket trigger also fired for that cascade, so every company/workspace
-- delete died with "audit_events are append-only" and surfaced as HTTP 500.
-- Keep the guarantee for application writes: UPDATE is always refused, and a
-- DELETE is refused whenever the owning organization still exists (meaning an
-- app-level delete rather than the FK cascade). RETURN NULL is required for a
-- BEFORE DELETE trigger to let the row go.
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit_events are append-only';
  END IF;
  IF TG_OP = 'DELETE' AND EXISTS (SELECT 1 FROM organizations o WHERE o.id = OLD.organization_id) THEN
    RAISE EXCEPTION 'audit_events are append-only';
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
