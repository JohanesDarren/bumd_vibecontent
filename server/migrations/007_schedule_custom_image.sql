-- Replacement cover chosen by the team: an uploaded file or an AI-generated image (data URL).
ALTER TABLE content_schedules ADD COLUMN IF NOT EXISTS custom_image text;
ALTER TABLE content_schedules ADD COLUMN IF NOT EXISTS custom_image_source text;
DO $$ BEGIN
  ALTER TABLE content_schedules ADD CONSTRAINT content_schedules_custom_image_source_check CHECK (custom_image_source IS NULL OR custom_image_source IN ('upload','ai'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
