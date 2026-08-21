-- Add last_imported_at to track when each location was last imported from Google Sheets
ALTER TABLE locations ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ;

-- Initialize last_imported_at to now for existing locations that have been imported before
-- (we can't know the exact date, so we set it to a far past date so first import includes all rows)
UPDATE locations SET last_imported_at = now() - interval '365 years'
WHERE last_imported_at IS NULL;