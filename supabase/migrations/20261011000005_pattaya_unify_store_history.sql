-- Pattaya unification (Oct 2026): old POS store and new POS store are the SAME shop.
--
-- Context: the Pattaya location switched POS from store
--   5b36d7b8-d523-475e-ad60-c7318538acec (old, closed, still listed by /stores)
-- to
--   4d7f0f90-90ec-4539-9a7a-190a13f047fb ("Capy Pattaya").
-- locations.loyverse_store_id now points at the new store, so rows synced for
-- the old store after the switch got location_id = NULL and the dashboard
-- (grouped per store) showed TWO "pattaya" cards.
--
-- Fix (data, non-destructive): only fill location_id WHERE IT IS NULL.
-- No key (account_key, store_id, date) is touched, no row deleted, no amount
-- changed. The dashboard groups per location, so old + new merge into ONE
-- Pattaya card with continuous history; overlapping cutover dates sum naturally
-- (old POS sales + new POS sales = shop total for the day).

DO $$
DECLARE
  pattaya_id UUID;
BEGIN
  SELECT id INTO pattaya_id FROM locations WHERE slug = 'pattaya';
  IF pattaya_id IS NULL THEN
    RAISE NOTICE 'Pattaya location not found, skipping backfill';
    RETURN;
  END IF;

  UPDATE loyverse_daily_snapshots
  SET location_id = pattaya_id
  WHERE account_key = 'pattaya'
    AND store_id = '5b36d7b8-d523-475e-ad60-c7318538acec'
    AND location_id IS NULL;

  UPDATE loyverse_shifts_raw
  SET location_id = pattaya_id
  WHERE account_key = 'pattaya'
    AND store_id = '5b36d7b8-d523-475e-ad60-c7318538acec'
    AND location_id IS NULL;

  UPDATE loyverse_daily_sales
  SET location_id = pattaya_id
  WHERE account_key = 'pattaya'
    AND store_id = '5b36d7b8-d523-475e-ad60-c7318538acec'
    AND location_id IS NULL;
END $$;
