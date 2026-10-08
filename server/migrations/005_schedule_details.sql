-- Per-platform caption, campaign grouping, content pillar, and the published post link.
ALTER TABLE content_schedules ADD COLUMN IF NOT EXISTS caption text;
ALTER TABLE content_schedules ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE content_schedules ADD COLUMN IF NOT EXISTS pillar text;
ALTER TABLE content_schedules ADD COLUMN IF NOT EXISTS post_url text;
DO $$ BEGIN
  ALTER TABLE content_schedules ADD CONSTRAINT content_schedules_pillar_check CHECK (pillar IS NULL OR pillar IN ('edukasi','layanan','korporat'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE content_schedules ADD CONSTRAINT content_schedules_post_url_check CHECK (post_url IS NULL OR post_url ~ '^https?://');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
