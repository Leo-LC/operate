-- Add salary and credits fields to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS base_salary_monthly  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS has_thai_bank_account BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_hours          NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_note           TEXT;

-- HR settings: overtime multipliers + monthly hours divisor
CREATE TABLE IF NOT EXISTS hr_settings (
  id                           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id              UUID         NOT NULL REFERENCES organizations(id),
  monthly_hours_divisor        NUMERIC(6,2) NOT NULL DEFAULT 208,
  overtime_weekday_multiplier  NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  overtime_weekend_multiplier  NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  overtime_holiday_multiplier  NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  updated_at                   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Attendance records: manual exception tracking (absences, OT, leaves)
CREATE TABLE IF NOT EXISTS attendance_records (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id),
  location_id     UUID         NOT NULL REFERENCES locations(id),
  employee_id     UUID         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_date     DATE         NOT NULL,
  record_type     TEXT         NOT NULL,
  hours           NUMERIC(5,2),
  note            TEXT,
  created_by      UUID         REFERENCES users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(employee_id, record_date, record_type)
);

-- Payment records: one row per employee per month
CREATE TABLE IF NOT EXISTS employee_payment_records (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID         NOT NULL REFERENCES organizations(id),
  location_id              UUID         NOT NULL REFERENCES locations(id),
  employee_id              UUID         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year              INTEGER      NOT NULL,
  period_month             INTEGER      NOT NULL,
  -- Calculation snapshot
  scheduled_hours          NUMERIC(8,2) NOT NULL DEFAULT 0,
  missed_hours             NUMERIC(8,2) NOT NULL DEFAULT 0,
  hourly_rate_snapshot     NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Payment amounts
  base_salary              NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions               NUMERIC(12,2) NOT NULL DEFAULT 0,
  deduction_note           TEXT,
  overtime_pay             NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_charge           NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_charge_is_manual BOOLEAN      NOT NULL DEFAULT false,
  bonus_amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus_note               TEXT,
  credit_hours_applied     NUMERIC(6,2)  NOT NULL DEFAULT 0,
  -- Admin
  payment_method           TEXT         NOT NULL DEFAULT 'cash',
  status                   TEXT         NOT NULL DEFAULT 'draft',
  paid_at                  TIMESTAMPTZ,
  notes                    TEXT,
  created_by               UUID         REFERENCES users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT unique_payment UNIQUE(employee_id, period_year, period_month)
);
