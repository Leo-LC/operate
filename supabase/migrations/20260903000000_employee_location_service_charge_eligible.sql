-- Per-location service charge eligibility.
-- An employee working at multiple shops can be eligible at one shop but not another.

ALTER TABLE employee_locations
  ADD COLUMN IF NOT EXISTS service_charge_eligible BOOLEAN NOT NULL DEFAULT true;

-- Backfill from the legacy global column per employee.
UPDATE employee_locations el
SET service_charge_eligible = COALESCE(e.service_charge_eligible, true)
FROM employees e
WHERE el.employee_id = e.id
  AND el.service_charge_eligible IS NOT DISTINCT FROM true
  AND e.service_charge_eligible = false;

-- employees.service_charge_eligible is kept for backward compatibility
-- (single-shop legacy) but the per-location value is now the source of truth.
