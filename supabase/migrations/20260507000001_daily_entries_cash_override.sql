-- Allow explicit manual override of cash_safe on any day
ALTER TABLE daily_entries
  ADD COLUMN IF NOT EXISTS cash_safe_is_override BOOLEAN NOT NULL DEFAULT FALSE;
