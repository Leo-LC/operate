-- Daily P&L alpha — isolated, additive finance read model.
-- This migration never alters Accounting, Payments, Treasury, Employees, or Locations.

CREATE TABLE IF NOT EXISTS finance_legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS finance_location_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  legal_entity_id UUID REFERENCES finance_legal_entities(id) ON DELETE SET NULL,
  operational_start_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id)
);

CREATE TABLE IF NOT EXISTS finance_sheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  source_hash TEXT NOT NULL,
  source_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, entry_date)
);

CREATE TABLE IF NOT EXISTS finance_sheet_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  finance_sheet_entry_id UUID REFERENCES finance_sheet_entries(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  before_payload JSONB,
  after_payload JSONB NOT NULL,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  source_hash TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_cost_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('group', 'entity', 'location')),
  legal_entity_id UUID REFERENCES finance_legal_entities(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('one_off', 'monthly', 'annual', 'custom')),
  estimated_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  allocation_method TEXT NOT NULL DEFAULT 'direct'
    CHECK (allocation_method IN ('direct', 'equal', 'revenue', 'custom')),
  custom_allocations JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_cost_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  cost_rule_id UUID REFERENCES finance_cost_rules(id) ON DELETE SET NULL,
  service_from DATE NOT NULL,
  service_to DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  paid_on DATE,
  notes TEXT,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cost_rule_id, service_from, service_to)
);

CREATE TABLE IF NOT EXISTS finance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'reclassification')),
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('group', 'entity', 'location')),
  legal_entity_id UUID REFERENCES finance_legal_entities(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  adjustment_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  source_field TEXT,
  cost_rule_id UUID REFERENCES finance_cost_rules(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_payroll_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  amount NUMERIC(14,2) NOT NULL,
  value_status TEXT NOT NULL DEFAULT 'estimated' CHECK (value_status IN ('estimated', 'actual')),
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, period_year, period_month)
);

CREATE TABLE IF NOT EXISTS finance_sync_config (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMPTZ,
  last_run_result JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  reason TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_sheet_entries_date_idx ON finance_sheet_entries(organization_id, entry_date, location_id);
CREATE INDEX IF NOT EXISTS finance_cost_rules_scope_idx ON finance_cost_rules(organization_id, scope_type, is_active);
CREATE INDEX IF NOT EXISTS finance_cost_actuals_period_idx ON finance_cost_actuals(organization_id, service_from, service_to);
CREATE INDEX IF NOT EXISTS finance_adjustments_date_idx ON finance_adjustments(organization_id, adjustment_date);
CREATE INDEX IF NOT EXISTS finance_payroll_period_idx ON finance_payroll_overrides(organization_id, period_year, period_month);

ALTER TABLE finance_legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_location_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_sheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_sheet_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cost_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cost_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_payroll_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_audit_events ENABLE ROW LEVEL SECURITY;

-- Seed a default entity and assignments by copying existing reference data.
INSERT INTO finance_legal_entities (organization_id, name, slug)
SELECT id, name, slug FROM organizations
ON CONFLICT (organization_id, slug) DO NOTHING;

INSERT INTO finance_location_assignments (organization_id, location_id, legal_entity_id, operational_start_date)
SELECT
  l.organization_id,
  l.id,
  e.id,
  (SELECT min(d.entry_date) FROM daily_entries d WHERE d.location_id = l.id)
FROM locations l
JOIN finance_legal_entities e ON e.organization_id = l.organization_id AND e.slug = (
  SELECT o.slug FROM organizations o WHERE o.id = l.organization_id
)
ON CONFLICT (organization_id, location_id) DO NOTHING;

INSERT INTO finance_sync_config (organization_id, enabled)
SELECT id, false FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Copy legacy fixed-expense values into isolated finance rules and actuals.
WITH legacy_values AS (
  SELECT m.organization_id, m.location_id, m.year, m.month, c.key, c.label,
         COALESCE((m.category_values ->> c.key)::numeric, 0) AS amount,
         m.notes
  FROM monthly_fixed_expenses m
  JOIN fixed_expense_categories c ON c.organization_id = m.organization_id
  WHERE COALESCE((m.category_values ->> c.key)::numeric, 0) <> 0
), inserted_rules AS (
  INSERT INTO finance_cost_rules (
    organization_id, label, category, scope_type, location_id, cadence,
    estimated_amount, effective_from, effective_to, allocation_method, notes, reason
  )
  SELECT organization_id, label, key, 'location', location_id, 'monthly', amount,
         make_date(year, month, 1),
         (make_date(year, month, 1) + interval '1 month - 1 day')::date,
         'direct', notes, 'Copied from monthly_fixed_expenses during Daily P&L alpha setup'
  FROM legacy_values
  RETURNING id, organization_id, location_id, category, effective_from, effective_to
)
INSERT INTO finance_cost_actuals (organization_id, cost_rule_id, service_from, service_to, amount, notes, reason)
SELECT r.organization_id, r.id, r.effective_from, r.effective_to, v.amount, v.notes,
       'Copied from monthly_fixed_expenses during Daily P&L alpha setup'
FROM inserted_rules r
JOIN legacy_values v ON v.organization_id = r.organization_id
  AND v.location_id = r.location_id AND v.key = r.category
  AND make_date(v.year, v.month, 1) = r.effective_from;
