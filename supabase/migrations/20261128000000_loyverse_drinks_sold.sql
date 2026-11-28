-- Track number of Drinks articles sold (quantity), for the drinks-per-customer KPI.
ALTER TABLE loyverse_daily_snapshots
  ADD COLUMN IF NOT EXISTS drinks_sold INTEGER NOT NULL DEFAULT 0;
