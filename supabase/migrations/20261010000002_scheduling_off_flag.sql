-- Persist confirmed days off explicitly so OFF survives reloads
-- (absence of row = unscheduled, presence with is_off = confirmed OFF).

ALTER TABLE schedule_shifts
  ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS schedule_shifts_off_idx
  ON schedule_shifts(schedule_id, shift_date) WHERE is_off = true;
