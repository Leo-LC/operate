-- Scheduling settings + time off + audit history.
-- No labor-law constants (per owner decision). Hours are informational only.

CREATE TABLE IF NOT EXISTS scheduling_global_settings (
  id                INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  palette           JSONB NOT NULL DEFAULT '{"opening": "soft-green", "daytime": "soft-blue", "closing": "soft-orange", "off": "neutral-gray", "unscheduled": "hatched"}',
  shift_thresholds  JSONB NOT NULL DEFAULT '{"open_after_open_min": 60, "close_before_close_min": 60}',
  default_break_minutes INT NOT NULL DEFAULT 30 CHECK (default_break_minutes >= 0),
  updated_by        UUID REFERENCES users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS location_scheduling_settings (
  location_id           UUID PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
  opening_time          TIME NOT NULL DEFAULT '07:00',
  closing_time          TIME NOT NULL DEFAULT '21:30',
  default_break_minutes INT NOT NULL DEFAULT 30 CHECK (default_break_minutes >= 0),
  min_staff_json        JSONB NOT NULL DEFAULT '{}',
  updated_by            UUID REFERENCES users(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_time_off (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  date_from   DATE NOT NULL,
  date_to     DATE NOT NULL CHECK (date_to >= date_from),
  kind        TEXT NOT NULL DEFAULT 'approved' CHECK (kind IN ('approved', 'pending')),
  reason      TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_shift_audits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  shift_id    UUID,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  shift_date  DATE,
  before_json JSONB,
  after_json  JSONB,
  actor_id    UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scheduling_global_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_scheduling_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_off            ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shift_audits        ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS employee_time_off_employee_idx ON employee_time_off(employee_id, date_from, date_to);
CREATE INDEX IF NOT EXISTS schedule_shift_audits_schedule_idx ON schedule_shift_audits(schedule_id, created_at DESC);

-- Seed the single global row + one settings row per active location.
INSERT INTO scheduling_global_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO location_scheduling_settings (location_id)
SELECT id FROM locations WHERE is_active = true
ON CONFLICT (location_id) DO NOTHING;
