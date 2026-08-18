-- Animals module: individual animal records (one per animal) are the source of
-- truth. Per-shop license counts are computed from the animals table at render
-- time, so the standalone animal_licenses table is dropped if it exists.

DROP TABLE IF EXISTS animal_licenses;

-- Remove the pre-existing test/sample animal record so the list starts clean.
DELETE FROM animals
WHERE organization_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND deleted_at IS NULL;
