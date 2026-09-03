-- Finance cost categories registry — allows custom categories shared across all shops.

CREATE TABLE IF NOT EXISTS finance_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

ALTER TABLE finance_cost_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE finance_cost_categories FROM anon, authenticated;
GRANT ALL ON TABLE finance_cost_categories TO service_role;

-- Seed existing hard-coded categories so they appear in the registry.
INSERT INTO finance_cost_categories (organization_id, slug, label)
SELECT id, slug, label FROM (
  SELECT 'a1b2c3d4-0000-0000-0000-000000000001'::uuid AS organization_id, 'rent' AS slug, 'Rent' AS label
  UNION ALL SELECT 'a1b2c3d4-0000-0000-0000-000000000001', 'utilities', 'Utilities'
  UNION ALL SELECT 'a1b2c3d4-0000-0000-0000-000000000001', 'marketing', 'Marketing'
  UNION ALL SELECT 'a1b2c3d4-0000-0000-0000-000000000001', 'support_workers', 'Support workers'
  UNION ALL SELECT 'a1b2c3d4-0000-0000-0000-000000000001', 'other', 'Accounting'
) seed
ON CONFLICT (organization_id, slug) DO NOTHING;
