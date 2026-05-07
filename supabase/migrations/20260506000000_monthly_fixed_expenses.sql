-- Monthly fixed expenses per shop (per-category, replacing the single-amount monthly_fixed_costs)
-- monthly_fixed_costs is preserved for backward compatibility

CREATE TABLE IF NOT EXISTS monthly_fixed_expenses (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID          NOT NULL REFERENCES organizations(id),
  location_id       UUID          NOT NULL REFERENCES locations(id),
  year              INTEGER       NOT NULL,
  month             INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Capybara seed categories (config-driven in UI via MONTHLY_EXPENSE_CATEGORIES)
  rent              NUMERIC(12,2) NOT NULL DEFAULT 0,
  electricity       NUMERIC(12,2) NOT NULL DEFAULT 0,
  water             NUMERIC(12,2) NOT NULL DEFAULT 0,
  marketing         NUMERIC(12,2) NOT NULL DEFAULT 0,
  dara_agency       NUMERIC(12,2) NOT NULL DEFAULT 0,
  ing_on_accounting NUMERIC(12,2) NOT NULL DEFAULT 0,
  nuy               NUMERIC(12,2) NOT NULL DEFAULT 0,

  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT monthly_fixed_expenses_unique UNIQUE (location_id, year, month)
);

ALTER TABLE monthly_fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS mfe_loc_year_month ON monthly_fixed_expenses(location_id, year, month);
CREATE INDEX IF NOT EXISTS mfe_org_year       ON monthly_fixed_expenses(organization_id, year);
