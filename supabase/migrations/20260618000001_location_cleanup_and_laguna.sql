-- Remove Capybara Resort Chiang Mai entirely (location, its documents, its access grants).
-- Rename remaining locations to plain place names (drop "Capybara Coffee " / "Bangkok " prefixes).
-- Add the upcoming Laguna location as "opening soon" (is_active = false, hidden everywhere
-- except the admin Locations panel, until an owner flips it active).

DELETE FROM documents            WHERE location_id = '47f3b65b-28c8-482b-9542-399ed33723e6';
DELETE FROM user_location_access WHERE location_id = '47f3b65b-28c8-482b-9542-399ed33723e6';
DELETE FROM employee_locations   WHERE location_id = '47f3b65b-28c8-482b-9542-399ed33723e6';
DELETE FROM contact_locations    WHERE location_id = '47f3b65b-28c8-482b-9542-399ed33723e6';
DELETE FROM locations            WHERE id = '47f3b65b-28c8-482b-9542-399ed33723e6';

UPDATE locations SET name = 'Phangan',    slug = 'phangan'    WHERE slug = 'phangan';
UPDATE locations SET name = 'Ekkamai',    slug = 'ekkamai'    WHERE slug = 'bangkok-ekkamai';
UPDATE locations SET name = 'Samui',      slug = 'samui'      WHERE slug = 'samui';
UPDATE locations SET name = 'Silom',      slug = 'silom'      WHERE slug = 'bangkok-silom';
UPDATE locations SET name = 'Pattaya',    slug = 'pattaya'    WHERE slug = 'pattaya';
UPDATE locations SET name = 'Chiang Mai', slug = 'chiang-mai' WHERE slug = 'chiang-mai';

INSERT INTO locations (organization_id, name, slug, external_id, is_active)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Laguna',
  'laguna',
  NULL,
  false
)
ON CONFLICT (organization_id, slug) DO NOTHING;
