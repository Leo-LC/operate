-- Per-location salary for employees.
-- An employee can work at multiple shops, each with its own monthly salary
-- (e.g. Staff 8 covers several shops at ฿25,000 each).
-- The legacy employees.base_salary_monthly column is kept in sync with the
-- primary location's salary for backward compatibility (payments, attendance).

ALTER TABLE employee_locations
  ADD COLUMN IF NOT EXISTS base_salary_monthly NUMERIC(12,2);

-- Backfill the primary location rows from the legacy single salary value.
UPDATE employee_locations el
SET base_salary_monthly = e.base_salary_monthly
FROM employees e
WHERE el.employee_id = e.id
  AND el.is_primary = true
  AND e.base_salary_monthly IS NOT NULL
  AND el.base_salary_monthly IS NULL;