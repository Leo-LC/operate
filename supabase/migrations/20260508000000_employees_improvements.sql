ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_permit_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_permit_expires_at DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS employee_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(employee_id, location_id)
);

-- Backfill from existing location_id column
INSERT INTO employee_locations (employee_id, location_id, is_primary)
SELECT id, location_id, true
FROM employees
WHERE location_id IS NOT NULL AND deleted_at IS NULL
ON CONFLICT DO NOTHING;
