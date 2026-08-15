-- Seed: 2025 revenue data for Phangan and Samui locations
-- Run after 20260814130000_monthly_revenue_inputs migration.
-- Idempotent: uses ON CONFLICT DO NOTHING for updates.

-- Organization ID from 01_capybara_seed.sql
-- 'a1b2c3d4-0000-0000-0000-000000000001'

-- Get location IDs for Phangan and Samui
WITH location_ids AS (
  SELECT
    id as location_id,
    name
  FROM locations
  WHERE organization_id = 'a1b2c3d4-0000-0000-0000-000000000001'
    AND name IN ('Phangan', 'Samui')
),
-- Revenue data for 2025
revenue_data AS (
  SELECT * FROM (VALUES
    -- Phangan 2025
    ('Phangan', 1, 588480),
    ('Phangan', 2, 693554),
    ('Phangan', 3, 517117),
    ('Phangan', 4, 711686),
    ('Phangan', 5, 469807),
    ('Phangan', 6, 525491),
    ('Phangan', 7, 949050),
    ('Phangan', 8, 1191789),
    ('Phangan', 9, 566034),
    ('Phangan', 10, 547491),
    ('Phangan', 11, 477148),
    ('Phangan', 12, 736280),
    -- Samui 2025
    ('Samui', 1, 3152733.50),
    ('Samui', 2, 2675099.00),
    ('Samui', 3, 2708845.00),
    ('Samui', 4, 2803286.00),
    ('Samui', 5, 1835479.00),
    ('Samui', 6, 1756156.00),
    ('Samui', 7, 2673417.00),
    ('Samui', 8, 2880865.00),
    ('Samui', 9, 1443627.00),
    ('Samui', 10, 1378268.00),
    ('Samui', 11, 1358158.00),
    ('Samui', 12, 2112839.00)
  ) AS v(location_name, month, amount)
)
INSERT INTO monthly_revenue_inputs (
  organization_id,
  location_id,
  year,
  month,
  amount,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  'a1b2c3d4-0000-0000-0000-000000000001' as organization_id,
  li.location_id,
  2025 as year,
  rd.month,
  rd.amount,
  NULL as created_by,  -- Will be set by trigger or default
  NULL as updated_by,  -- Will be set by trigger or default
  now() as created_at,
  now() as updated_at
FROM revenue_data rd
JOIN location_ids li ON rd.location_name = li.name
ON CONFLICT (organization_id, location_id, year, month)
DO UPDATE SET
  amount = EXCLUDED.amount,
  updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at;