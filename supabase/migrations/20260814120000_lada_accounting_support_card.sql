-- Move the "Lada accounting" recurring costs under the Support workers
-- category so the recurring costs module renders them as a support card
-- (5000 for Phangan, 5000 for Silom; no rows for the other shops).
-- Idempotent: only touches rows currently labelled "Lada accounting".

UPDATE finance_cost_rules
SET category = 'support_workers',
    custom_allocations = jsonb_build_object('amount_mode', 'fixed', 'support_type', 'accounting'),
    updated_at = now()
WHERE label = 'Lada accounting'
  AND category = 'other'
  AND organization_id = 'a1b2c3d4-0000-0000-0000-000000000001';
