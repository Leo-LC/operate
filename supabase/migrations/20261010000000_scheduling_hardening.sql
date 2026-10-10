-- Scheduling hardening: prevent duplicate cells from autosave races,
-- speed up range queries for the annual editor.

CREATE UNIQUE INDEX IF NOT EXISTS schedule_shifts_unique_cell
  ON schedule_shifts(schedule_id, employee_id, shift_date);

CREATE INDEX IF NOT EXISTS schedule_shifts_employee_date_idx
  ON schedule_shifts(employee_id, shift_date);

CREATE INDEX IF NOT EXISTS schedule_shifts_schedule_date_idx
  ON schedule_shifts(schedule_id, shift_date);

ALTER TABLE schedule_shifts
  DROP CONSTRAINT IF EXISTS schedule_shifts_break_minutes_check;

ALTER TABLE schedule_shifts
  ADD CONSTRAINT schedule_shifts_break_minutes_check CHECK (break_minutes >= 0);
