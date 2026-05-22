
ALTER TABLE campaigns ADD COLUMN media_url TEXT AFTER template_id;
ALTER TABLE campaigns ADD COLUMN media_type VARCHAR(50) AFTER media_url;
