-- Preserve every historical fixed-expense row in the isolated finance register,
-- including legacy months whose category values are all zero.

WITH legacy_rows AS (
  SELECT
    m.id AS source_id,
    m.organization_id,
    m.location_id,
    m.year,
    m.month,
    m.notes,
    COALESCE((
      SELECT sum(value::numeric)
      FROM jsonb_each_text(m.category_values)
    ), 0) AS amount
  FROM monthly_fixed_expenses m
), inserted_rules AS (
  INSERT INTO finance_cost_rules (
    organization_id,
    label,
    category,
    scope_type,
    location_id,
    cadence,
    estimated_amount,
    effective_from,
    effective_to,
    allocation_method,
    notes,
    reason
  )
  SELECT
    l.organization_id,
    'Legacy fixed expenses ' || to_char(make_date(l.year, l.month, 1), 'YYYY-MM'),
    'legacy_fixed_expenses',
    'location',
    l.location_id,
    'monthly',
    l.amount,
    make_date(l.year, l.month, 1),
    (make_date(l.year, l.month, 1) + interval '1 month - 1 day')::date,
    'direct',
    concat_ws(E'\n', l.notes, 'Source monthly_fixed_expenses: ' || l.source_id::text),
    'Copied from monthly_fixed_expenses during Daily P&L alpha setup'
  FROM legacy_rows l
  WHERE NOT EXISTS (
    SELECT 1
    FROM finance_cost_rules r
    WHERE r.organization_id = l.organization_id
      AND r.location_id = l.location_id
      AND r.category = 'legacy_fixed_expenses'
      AND r.effective_from = make_date(l.year, l.month, 1)
      AND r.notes LIKE '%Source monthly_fixed_expenses: ' || l.source_id::text || '%'
  )
  RETURNING id, organization_id, location_id, effective_from, effective_to, estimated_amount, notes
)
INSERT INTO finance_cost_actuals (
  organization_id,
  cost_rule_id,
  service_from,
  service_to,
  amount,
  notes,
  reason
)
SELECT
  organization_id,
  id,
  effective_from,
  effective_to,
  estimated_amount,
  notes,
  'Copied from monthly_fixed_expenses during Daily P&L alpha setup'
FROM inserted_rules;
