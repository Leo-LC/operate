-- Simplify payments: drop schedule/attendance-derived payroll, move to a
-- manual base-salary + reasoned-adjustments model. Service charge stays
-- automatic (revenue x percentage) but the percentage is now configurable
-- per employee, falling back to a per-location default.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS default_service_charge_pct NUMERIC(5,2) NOT NULL DEFAULT 1;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS service_charge_pct NUMERIC(5,2);

CREATE TABLE IF NOT EXISTS payment_adjustments (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id  UUID         NOT NULL REFERENCES employee_payment_records(id) ON DELETE CASCADE,
  amount             NUMERIC(12,2) NOT NULL,
  reason             TEXT         NOT NULL,
  created_by         UUID         REFERENCES users(id),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_adjustments_record ON payment_adjustments(payment_record_id);

ALTER TABLE employee_payment_records
  DROP COLUMN IF EXISTS scheduled_hours,
  DROP COLUMN IF EXISTS missed_hours,
  DROP COLUMN IF EXISTS hourly_rate_snapshot,
  DROP COLUMN IF EXISTS credit_hours_applied,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS deductions,
  DROP COLUMN IF EXISTS deduction_note,
  DROP COLUMN IF EXISTS bonus_amount,
  DROP COLUMN IF EXISTS bonus_note,
  DROP COLUMN IF EXISTS overtime_pay,
  DROP COLUMN IF EXISTS service_charge_is_manual;
