-- Dynamic fixed expense categories (replaces hardcoded columns)

-- 1. Categories lookup table
CREATE TABLE IF NOT EXISTS fixed_expense_categories (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id),
  key             TEXT        NOT NULL,
  label           TEXT        NOT NULL,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fec_unique UNIQUE (organization_id, key)
);

ALTER TABLE fixed_expense_categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS fec_org_active ON fixed_expense_categories(organization_id, is_active);

-- 2. Seed default categories
INSERT INTO fixed_expense_categories (organization_id, key, label, sort_order) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'rent',              'Rent',              1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'electricity',       'Electricity',       2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'water',             'Water',             3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'marketing',         'Marketing',         4),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'dara_agency',       'Dara Agency',       5),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'ing_on_accounting', 'Ing on Accounting', 6),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'nuy',               'Nuy',               7)
ON CONFLICT (organization_id, key) DO NOTHING;

-- 3. Add JSONB column to monthly_fixed_expenses
ALTER TABLE monthly_fixed_expenses
  ADD COLUMN IF NOT EXISTS category_values JSONB NOT NULL DEFAULT '{}';

-- 4. Migrate existing data from individual columns into JSONB
UPDATE monthly_fixed_expenses SET category_values = jsonb_build_object(
  'rent',              COALESCE(rent, 0),
  'electricity',       COALESCE(electricity, 0),
  'water',             COALESCE(water, 0),
  'marketing',         COALESCE(marketing, 0),
  'dara_agency',       COALESCE(dara_agency, 0),
  'ing_on_accounting', COALESCE(ing_on_accounting, 0),
  'nuy',               COALESCE(nuy, 0)
);

-- 5. Drop the old hardcoded columns
ALTER TABLE monthly_fixed_expenses
  DROP COLUMN IF EXISTS rent,
  DROP COLUMN IF EXISTS electricity,
  DROP COLUMN IF EXISTS water,
  DROP COLUMN IF EXISTS marketing,
  DROP COLUMN IF EXISTS dara_agency,
  DROP COLUMN IF EXISTS ing_on_accounting,
  DROP COLUMN IF EXISTS nuy;
