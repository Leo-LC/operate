-- Animal species as managed list (like fixed_expense_categories)
-- Selectable when creating an animal, extensible via "Add new species"

CREATE TABLE IF NOT EXISTS animal_species (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id),
  key             TEXT        NOT NULL,
  label           TEXT        NOT NULL,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT animal_species_unique UNIQUE (organization_id, key)
);

ALTER TABLE animal_species ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS animal_species_org_active ON animal_species(organization_id, is_active);

-- Seed default species (Capybara, Meerkat)
INSERT INTO animal_species (organization_id, key, label, sort_order) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'capybara', 'Capybara', 1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'meerkat',  'Meerkat',  2)
ON CONFLICT (organization_id, key) DO NOTHING;

-- Backfill any distinct species already used in animals that are not yet in the list
INSERT INTO animal_species (organization_id, key, label, sort_order)
SELECT DISTINCT
  'a1b2c3d4-0000-0000-0000-000000000001',
  lower(trim(species)),
  initcap(trim(species)),
  100
FROM animals
WHERE organization_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND trim(species) <> ''
  AND lower(trim(species)) NOT IN (SELECT key FROM animal_species WHERE organization_id = 'a1b2c3d4-0000-0000-0000-000000000001')
ON CONFLICT (organization_id, key) DO NOTHING;
