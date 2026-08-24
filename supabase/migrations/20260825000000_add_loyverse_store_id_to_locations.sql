-- Loyverse store mapping — allow admin/locations to link a Nexus location to a Loyverse store_id
-- Complements the code const LOYVERSE_STORE_TO_LOCATION (kept as fallback)

ALTER TABLE locations ADD COLUMN IF NOT EXISTS loyverse_store_id TEXT;

-- Optional index for reverse lookup (store_id -> location)
CREATE INDEX IF NOT EXISTS locations_loyverse_store_id_idx ON locations(loyverse_store_id) WHERE loyverse_store_id IS NOT NULL;

-- No RLS change needed; locations is already RLS enabled and accessed via service role.
-- Existing policies allow owner to read/update locations (via admin API).

COMMENT ON COLUMN locations.loyverse_store_id IS 'Loyverse store_id (from GET /stores) linked to this Nexus location. Used by loyverse_daily_snapshots.location_id mapping. Prefer this over the code const.';
