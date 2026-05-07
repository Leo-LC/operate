-- Schedules module
-- weekly_schedule per location, shifts per employee per day.

CREATE TABLE IF NOT EXISTS schedules (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id),
  location_id      UUID        NOT NULL REFERENCES locations(id),
  name             TEXT        NOT NULL,
  week_start_date  DATE        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'published', 'archived')),
  created_by       UUID        REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS schedule_shifts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id  UUID        NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  employee_id  UUID        NOT NULL REFERENCES employees(id),
  shift_date   DATE        NOT NULL,
  start_time   TIME,
  end_time     TIME,
  break_minutes INT        NOT NULL DEFAULT 30,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schedules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shifts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS schedules_org_idx      ON schedules(organization_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS schedules_location_idx ON schedules(location_id)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS schedules_week_idx     ON schedules(week_start_date)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS shifts_schedule_idx    ON schedule_shifts(schedule_id);
CREATE INDEX IF NOT EXISTS shifts_employee_idx    ON schedule_shifts(employee_id);
