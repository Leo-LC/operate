-- Seed animals module: one row per animal per shop, using placeholder aliases
-- until real names are known. Idempotent: re-running only fills gaps.
-- Alias pattern: <species short> <location short> <n>  e.g. capy ekk 1, meerkat sam 2
-- Location short codes come from the first 3 chars of the location slug.

WITH counts AS (
  SELECT 'ekkamai'   AS slug, 3 AS capybara, 6 AS meerkat
  UNION ALL SELECT 'silom',      6, 4
  UNION ALL SELECT 'phangan',    6, 5
  UNION ALL SELECT 'samui',      4, 5
  UNION ALL SELECT 'pattaya',    4, 3
  UNION ALL SELECT 'laguna',     4, 10
  UNION ALL SELECT 'chiang-mai', 3, 4
  UNION ALL SELECT 'resort',     4, 6
),
generated AS (
  SELECT
    l.id                                AS location_id,
    s.species,
    CASE WHEN s.species = 'capybara'
         THEN 'capy '    || substr(l.slug, 1, 3) || ' ' || s.n
         ELSE 'meerkat ' || substr(l.slug, 1, 3) || ' ' || s.n
    END                                 AS name
  FROM counts c
  JOIN locations l
    ON l.organization_id = 'a1b2c3d4-0000-0000-0000-000000000001'
   AND l.slug = c.slug
  CROSS JOIN LATERAL (
    SELECT 'capybara' AS species, generate_series(1, c.capybara) AS n
    UNION ALL
    SELECT 'meerkat',  generate_series(1, c.meerkat)
  ) s
)
INSERT INTO animals (organization_id, location_id, name, species, status)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001', location_id, name, species, 'active'
FROM generated g
WHERE NOT EXISTS (
  SELECT 1 FROM animals a
  WHERE a.organization_id = 'a1b2c3d4-0000-0000-0000-000000000001'
    AND a.name = g.name
    AND a.deleted_at IS NULL
);
