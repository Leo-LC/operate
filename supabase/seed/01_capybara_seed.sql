-- Seed: Capybara Coffee Thailand — organization, locations, first owner user
-- Run after 20260502000000_platform_foundation migration.
-- Idempotent: uses ON CONFLICT DO NOTHING throughout.
--
-- Before running: replace the owner email below with the actual owner email
-- (the value of OWNER_GOOGLE_EMAILS in your .env.local).

-- 1. Organization
INSERT INTO organizations (id, name, slug)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Capybara Coffee Thailand',
  'capybara-coffee-thailand'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Locations (source: src/lib/constants.ts LOCATION_NAMES)
--    external_id = Google Business Profile location name
INSERT INTO locations (organization_id, name, slug, external_id, is_active)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Phangan',
    'phangan',
    'locations/16151596174163473059',
    true
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Ekkamai',
    'ekkamai',
    'locations/10878815915536987618',
    true
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Samui',
    'samui',
    'locations/10753238730025479271',
    true
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Silom',
    'silom',
    'locations/2465044010509373862',
    true
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Pattaya',
    'pattaya',
    'locations/1605645991793886964',
    true
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Chiang Mai',
    'chiang-mai',
    'locations/1389494344977514093',
    true
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Laguna',
    'laguna',
    NULL,
    false
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Resort',
    'resort',
    NULL,
    true
  )
ON CONFLICT (organization_id, slug) DO NOTHING;

-- 3. First owner user
--    Replace 'owner@example.com' with the actual owner email before running.
INSERT INTO users (email, name, global_role, organization_id)
VALUES (
  'owner@example.com',
  'Owner',
  'owner',
  'a1b2c3d4-0000-0000-0000-000000000001'
)
ON CONFLICT (email) DO NOTHING;
