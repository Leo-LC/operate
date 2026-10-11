-- Pattaya Loyverse migration (Oct 2026): point the shop at its new POS store.
--
-- The new Pattaya Loyverse account exposes store
--   4d7f0f90-90ec-4539-9a7a-190a13f047fb ("Capy Pattaya")
-- replacing the old store 5b36d7b8-d523-475e-ad60-c7318538acec.
--
-- History safety: loyverse_daily_snapshots / shifts_raw / daily_sales are
-- keyed on (account_key, store_id, date), so old rows stay untouched — this
-- UPDATE only affects where FUTURE syncs attach (location_id mapping).
-- A guard in syncAccount() (see src/modules/loyverse/lib/sync.ts) skips
-- backfill dates already covered by any store for the same location, so the
-- first sync under the new store won't duplicate the last 30 days.
-- The new POS token itself lives in LOYVERSE_ACCOUNTS (env), never here.

UPDATE locations
SET loyverse_store_id = '4d7f0f90-90ec-4539-9a7a-190a13f047fb',
    loyverse_account_key = 'pattaya',
    updated_at = now()
WHERE slug = 'pattaya';
