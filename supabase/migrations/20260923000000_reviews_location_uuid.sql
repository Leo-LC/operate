-- Reviews consolidation — link review rows to the internal shop UUID.
--
-- `reviews_cache.location_id` and `location_gbp_ratings.location_id` store
-- the GBP text id ("locations/123…"), not the internal `locations.id` UUID.
-- Every consumer therefore re-translates GBP text → shop on the fly (fuzzy
-- name matching, hardcoded maps). These UUID columns become the join key:
-- written on every sync (dual-write with the TEXT column), backfilled for
-- history, read preferentially with TEXT fallback.
--
-- Rows from GBP locations with no row in `locations` (reviews-only, e.g.
-- the Resort Spa duplicate) keep location_uuid NULL — readers must keep the
-- TEXT fallback.

-- ——— reviews_cache.location_uuid ———
ALTER TABLE reviews_cache ADD COLUMN IF NOT EXISTS location_uuid UUID REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS reviews_cache_location_uuid_idx ON reviews_cache(location_uuid) WHERE location_uuid IS NOT NULL;
COMMENT ON COLUMN reviews_cache.location_uuid IS 'Internal locations.id resolved from the GBP text location_id at sync time. Prefer this over location_id for joins; TEXT fallback stays for reviews-only GBP locations.';

UPDATE reviews_cache rc
SET location_uuid = l.id
FROM locations l
WHERE rc.location_uuid IS NULL
  AND l.external_id IS NOT NULL
  AND l.external_id = rc.location_id;

-- ——— location_gbp_ratings.location_uuid ———
ALTER TABLE location_gbp_ratings ADD COLUMN IF NOT EXISTS location_uuid UUID REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS location_gbp_ratings_location_uuid_idx ON location_gbp_ratings(location_uuid) WHERE location_uuid IS NOT NULL;
COMMENT ON COLUMN location_gbp_ratings.location_uuid IS 'Internal locations.id resolved from the GBP text location_id at sync time. Prefer this over location_id for joins; TEXT fallback stays for reviews-only GBP locations.';

UPDATE location_gbp_ratings r
SET location_uuid = l.id
FROM locations l
WHERE r.location_uuid IS NULL
  AND l.external_id IS NOT NULL
  AND l.external_id = r.location_id;
