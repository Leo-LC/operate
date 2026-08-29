-- Track number of Ticket articles sold (quantity), distinct from receipt counts.
ALTER TABLE loyverse_daily_snapshots
  ADD COLUMN IF NOT EXISTS tickets_sold INTEGER NOT NULL DEFAULT 0;
