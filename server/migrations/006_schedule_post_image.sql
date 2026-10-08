-- Preview image fetched from the published post's URL (data URL).
ALTER TABLE content_schedules ADD COLUMN IF NOT EXISTS post_image text;
