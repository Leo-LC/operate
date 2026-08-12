-- Simplified, uniform monthly inputs for Daily P&L.
-- Additive only: existing finance and source-module tables remain untouched.

CREATE TABLE IF NOT EXISTS finance_shop_monthly_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  period_year INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2200),
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  salaries_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (salaries_amount >= 0),
  rent_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
  electricity_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (electricity_amount >= 0),
  water_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (water_amount >= 0),
  other_fixed_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (other_fixed_amount >= 0),
  service_charge_rate_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (service_charge_rate_pct BETWEEN 0 AND 100),
  employee_count INTEGER NOT NULL DEFAULT 0 CHECK (employee_count >= 0),
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS finance_shop_monthly_inputs_period_idx
  ON finance_shop_monthly_inputs (organization_id, period_year, period_month, location_id);

ALTER TABLE finance_shop_monthly_inputs ENABLE ROW LEVEL SECURITY;

-- This table is server-only. Explicit grants keep it available to the backend
-- when Supabase stops auto-exposing new public tables, without exposing it to clients.
REVOKE ALL ON TABLE finance_shop_monthly_inputs FROM anon, authenticated;
GRANT ALL ON TABLE finance_shop_monthly_inputs TO service_role;
