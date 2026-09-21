-- Shop consolidation — one shop = one `locations` row everywhere.
--
-- 1. `locations.code` — stable key shared by all modules (matches slug,
--    mirrors `ShopCode` in src/lib/shops.ts). Display name stays `name`
--    (edited in Admin → Shops); code never changes on rename.
-- 2. `locations.loyverse_account_key` — disambiguates stores when several
--    Loyverse accounts exist (UNIQUE with loyverse_store_id).
-- 3. `locations.reviews_only` — replaces the hardcoded
--    REVIEWS_ONLY_LOCATION_IDS set in src/lib/constants.ts.
-- 4. `shop_aliases` — the missing link for "Opéra = Opera = store_id X":
--    every alternate spelling / external id per source lives here instead
--    of scattered hardcoded maps.
-- 5. `challenge_settings.location_id` — FK replacing the free-text
--    `location_key` (kept for compatibility during transition).

-- ——— locations.code ———
ALTER TABLE locations ADD COLUMN IF NOT EXISTS code TEXT;
UPDATE locations SET code = slug WHERE code IS NULL AND slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS locations_code_unique_idx ON locations(code) WHERE code IS NOT NULL;
COMMENT ON COLUMN locations.code IS 'Stable shop key shared by all modules (phangan, ekkamai, samui, silom, pattaya, chiang-mai, laguna, karon). Mirrors ShopCode in src/lib/shops.ts. Never changes on rename.';

-- ——— locations.loyverse_account_key ———
ALTER TABLE locations ADD COLUMN IF NOT EXISTS loyverse_account_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS locations_loyverse_store_unique_idx
  ON locations(loyverse_store_id, loyverse_account_key) WHERE loyverse_store_id IS NOT NULL;
COMMENT ON COLUMN locations.loyverse_account_key IS 'Loyverse account key (see src/lib/loyverse/accounts.ts) owning loyverse_store_id. Disambiguates stores when several accounts exist.';

-- ——— locations.reviews_only ———
ALTER TABLE locations ADD COLUMN IF NOT EXISTS reviews_only BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN locations.reviews_only IS 'True = visible in reviews module only (no accounting/challenges/scheduling). Replaces REVIEWS_ONLY_LOCATION_IDS in src/lib/constants.ts.';

-- ——— shop_aliases ———
CREATE TABLE IF NOT EXISTS shop_aliases (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   UUID        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  source        TEXT        NOT NULL,
  alias         TEXT        NOT NULL,
  is_legacy     BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shop_aliases_source_alias_unique UNIQUE (location_id, source, alias)
);
CREATE INDEX IF NOT EXISTS shop_aliases_alias_idx ON shop_aliases(source, alias);
ALTER TABLE shop_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE shop_aliases FROM anon, authenticated;
GRANT ALL ON TABLE shop_aliases TO service_role;
COMMENT ON TABLE shop_aliases IS 'Alternate spellings / external ids per shop and source (gbp, loyverse, sheet, insights, manual, challenge). Canonical resolution logic lives in src/lib/shops.ts.';

-- Seed canonical GBP-title aliases from the hardcoded LOCATION_NAMES map
-- (src/lib/constants.ts) so history keeps resolving after consolidation.
DO $$
DECLARE
  org_id UUID;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'capybara-coffee-thailand' LIMIT 1;
  IF org_id IS NULL THEN RETURN; END IF;

  INSERT INTO shop_aliases (location_id, source, alias)
  SELECT l.id, 'insights', a.alias
  FROM locations l
  JOIN (VALUES
    ('phangan', 'koh phangan'), ('phangan', 'ko phangan'),
    ('ekkamai', 'bkk ekkamai'), ('ekkamai', 'bangkok ekkamai'),
    ('samui', 'koh samui'), ('samui', 'ko samui'),
    ('silom', 'bangkok silom'), ('silom', 'bkk silom'),
    ('chiang-mai', 'chiangmai'), ('chiang-mai', 'cm'),
    ('laguna', 'phuket laguna'), ('laguna', 'laguna phuket')
  ) AS a(slug, alias) ON a.slug = l.slug
  WHERE l.organization_id = org_id
  ON CONFLICT DO NOTHING;

  -- Legacy: bare "Phuket" meant Laguna before Karon opened.
  INSERT INTO shop_aliases (location_id, source, alias, is_legacy)
  SELECT l.id, 'insights', a.alias, true
  FROM locations l
  JOIN (VALUES ('laguna', 'phuket'), ('laguna', 'phuket town'), ('laguna', 'phuket old town')) AS a(slug, alias) ON a.slug = l.slug
  WHERE l.organization_id = org_id
  ON CONFLICT DO NOTHING;

  -- Karon aliases.
  INSERT INTO shop_aliases (location_id, source, alias)
  SELECT l.id, 'insights', a.alias
  FROM locations l
  JOIN (VALUES ('karon', 'karon beach'), ('karon', 'karon phuket'), ('karon', 'phuket karon')) AS a(slug, alias) ON a.slug = l.slug
  WHERE l.organization_id = org_id
  ON CONFLICT DO NOTHING;
END $$;

-- ——— challenge_settings.location_id (FK, replaces free-text location_key) ———
ALTER TABLE challenge_settings ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS challenge_settings_location_idx ON challenge_settings(location_id) WHERE location_id IS NOT NULL;

-- Backfill location_id from location_key via slug/name match.
UPDATE challenge_settings cs
SET location_id = l.id
FROM locations l
WHERE cs.location_id IS NULL
  AND l.organization_id = cs.organization_id
  AND (l.slug = REPLACE(cs.location_key, ' ', '-') OR LOWER(l.name) = LOWER(cs.location_key));
