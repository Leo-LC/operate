-- Karon GBP id correction (Oct 2026): the id initially hardcoded
-- (locations/14579586495106768485) was wrong — Google never returned it.
-- The real Karon fiche is locations/18305472203516651414 (set via
-- Admin -> Shops in prod). This aligns any env still carrying the wrong id
-- and backfills `code`. No-op where Admin was already fixed.
-- Idempotent, never touches a different manually-set value.

UPDATE locations
SET external_id = 'locations/18305472203516651414',
    code = COALESCE(code, 'karon'),
    updated_at = now()
WHERE slug = 'karon'
  AND external_id = 'locations/14579586495106768485';
