-- People and Finance navigation refactor.
-- Additive only: existing source tables and records remain authoritative.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employment_start_date DATE,
  ADD COLUMN IF NOT EXISTS employment_end_date DATE,
  ADD COLUMN IF NOT EXISTS service_charge_eligible BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS finance_shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  service_charge_rate_pct NUMERIC(7,4) NOT NULL DEFAULT 0
    CHECK (service_charge_rate_pct BETWEEN 0 AND 100),
  operational_start_date DATE,
  common_settings JSONB NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id)
);

CREATE INDEX IF NOT EXISTS finance_shop_settings_org_location_idx
  ON finance_shop_settings (organization_id, location_id);

ALTER TABLE finance_shop_settings ENABLE ROW LEVEL SECURITY;

-- Financial data is exposed only through authenticated backend routes.
REVOKE ALL ON TABLE finance_shop_settings FROM anon, authenticated;
GRANT ALL ON TABLE finance_shop_settings TO service_role;

-- Existing finance registers were already server-only in practice. Make their
-- Data API boundary explicit without changing rows or foreign keys.
REVOKE ALL ON TABLE finance_cost_rules FROM anon, authenticated;
REVOKE ALL ON TABLE finance_cost_actuals FROM anon, authenticated;
REVOKE ALL ON TABLE finance_audit_events FROM anon, authenticated;
GRANT ALL ON TABLE finance_cost_rules TO service_role;
GRANT ALL ON TABLE finance_cost_actuals TO service_role;
GRANT ALL ON TABLE finance_audit_events TO service_role;

-- Preserve the operational opening dates already established by Daily P&L.
INSERT INTO finance_shop_settings (
  organization_id, location_id, operational_start_date, reason
)
SELECT organization_id, location_id, operational_start_date,
       'Initialized from existing Daily P&L location assignment'
FROM finance_location_assignments
WHERE location_id IS NOT NULL
ON CONFLICT (organization_id, location_id) DO NOTHING;
