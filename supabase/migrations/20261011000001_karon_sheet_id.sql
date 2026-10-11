-- Set Karon accounting Sheet ID (provided by owner, Oct 2026).
-- Idempotent: only fills the row with slug='karon'.

UPDATE locations
SET google_sheet_id = '1YEyC6CJoRIVL7znhALUbfEVKywz2MZquI9OsZc8pofk',
    updated_at = now()
WHERE slug = 'karon'
  AND (google_sheet_id IS NULL OR google_sheet_id <> '1YEyC6CJoRIVL7znhALUbfEVKywz2MZquI9OsZc8pofk');
