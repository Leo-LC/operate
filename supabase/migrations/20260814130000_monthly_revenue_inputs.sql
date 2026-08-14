-- Year-over-year revenue comparison: simple monthly revenue inputs.
-- One row per shop per month, entered manually (e.g. full-year 2025 figures
-- that predate daily_entries accounting). This is the "previous year" side of
-- the comparison; the current-year side is computed from daily_entries.

CREATE TABLE IF NOT EXISTS monthly_revenue_inputs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID          NOT NULL REFERENCES organizations(id),
  location_id     UUID          NOT NULL REFERENCES locations(id),
  year            INTEGER       NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  month           INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_by      UUID          REFERENCES users(id),
  updated_by      UUID          REFERENCES users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT monthly_revenue_inputs_unique UNIQUE (organization_id, location_id, year, month)
);

CREATE INDEX IF NOT EXISTS monthly_revenue_inputs_period_idx
  ON monthly_revenue_inputs (organization_id, year, month, location_id);

ALTER TABLE monthly_revenue_inputs ENABLE ROW LEVEL SECURITY;

-- Server-only. Keep it out of client exposure (same as finance_shop_monthly_inputs).
REVOKE ALL ON TABLE monthly_revenue_inputs FROM anon, authenticated;
GRANT ALL ON TABLE monthly_revenue_inputs TO service_role;