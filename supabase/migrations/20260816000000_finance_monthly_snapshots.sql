-- Monthly snapshots for recurring costs: past months become immutable records
-- that can be consulted/adjusted and are used by reports daily P&L.
-- Also add bonus_amount to existing monthly inputs for forward compatibility.

ALTER TABLE finance_shop_monthly_inputs
  ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0);

CREATE TABLE IF NOT EXISTS finance_monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2200),
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  recurring_costs_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (recurring_costs_amount >= 0),
  payroll_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (payroll_amount >= 0),
  service_charge_rate_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (service_charge_rate_pct BETWEEN 0 AND 100),
  employee_count INTEGER NOT NULL DEFAULT 0 CHECK (employee_count >= 0),
  service_charge_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (service_charge_amount >= 0),
  challenge_bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (challenge_bonus_amount >= 0),
  status TEXT NOT NULL DEFAULT 'actual' CHECK (status IN ('estimated','actual','draft')),
  reason TEXT NOT NULL DEFAULT 'Snapshot from recurring costs',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS finance_monthly_snapshots_period_idx
  ON finance_monthly_snapshots (organization_id, period_year, period_month, location_id);

ALTER TABLE finance_monthly_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE finance_monthly_snapshots FROM anon, authenticated;
GRANT ALL ON TABLE finance_monthly_snapshots TO service_role;
