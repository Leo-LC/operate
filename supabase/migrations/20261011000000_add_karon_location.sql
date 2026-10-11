-- Add missing Karon shop + backfill Laguna GBP binding.
--
-- Root cause: src/lib/constants.ts LOCATION_NAMES maps
--   "locations/14579586495106768485" -> "Karon"
-- but no `locations` row with slug='karon' ever existed (seed + all
-- migrations only knew phangan/ekkamai/samui/silom/pattaya/chiang-mai/laguna).
-- getActiveLocationExternalIds() (src/lib/google-business.ts) builds the
-- allow-list from `locations WHERE is_active AND external_id IS NOT NULL`,
-- so /api/locations, /api/reviews/sync and challenges syncReviews() all
-- silently dropped Karon. Challenges overview then had no Karon row either
-- (no accounting/counters/reviews rows could join).
--
-- This migration is idempotent and never overwrites a manually edited row:
-- - inserts Karon only if slug missing
-- - fills Laguna external_id only when NULL (Laguna was created with NULL
--   in 20260618000001, owner may have filled it via Admin -> Shops already)
-- - backfills `code` (added in 20260922000000) where NULL

DO $$
DECLARE
  org_id UUID;
  karon_id UUID;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'capybara-coffee-thailand' LIMIT 1;
  IF org_id IS NULL THEN RETURN; END IF;

  -- 1. Karon row (GBP id must match LOCATION_NAMES in src/lib/constants.ts)
  INSERT INTO locations (organization_id, name, slug, code, external_id, is_active)
  VALUES (org_id, 'Karon', 'karon', 'karon', 'locations/14579586495106768485', true)
  ON CONFLICT (organization_id, slug) DO UPDATE
    SET external_id = COALESCE(locations.external_id, EXCLUDED.external_id),
        code = COALESCE(locations.code, 'karon'),
        is_active = true
  RETURNING id INTO karon_id;

  -- ON CONFLICT ... RETURNING returns nothing when no insert happened; fetch it.
  IF karon_id IS NULL THEN
    SELECT id INTO karon_id FROM locations WHERE organization_id = org_id AND slug = 'karon' LIMIT 1;
  END IF;

  -- 2. Laguna GBP binding (LOCATION_NAMES expects locations/5348429606642712133).
  -- Only fill when NULL so a manual Admin edit is never clobbered.
  UPDATE locations
  SET external_id = 'locations/5348429606642712133',
      code = COALESCE(code, 'laguna'),
      updated_at = now()
  WHERE organization_id = org_id
    AND slug = 'laguna'
    AND external_id IS NULL;

  -- 3. Backfill code for any legacy row missing it.
  UPDATE locations SET code = slug, updated_at = now()
  WHERE organization_id = org_id AND code IS NULL AND slug IS NOT NULL;

  -- 4. Karon insights aliases (mirrors 20260922000000 seed, which skipped
  -- Karon when the row didn't exist yet).
  IF karon_id IS NOT NULL THEN
    INSERT INTO shop_aliases (location_id, source, alias)
    SELECT karon_id, 'insights', a.alias
    FROM (VALUES ('karon beach'), ('karon phuket'), ('phuket karon')) AS a(alias)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
