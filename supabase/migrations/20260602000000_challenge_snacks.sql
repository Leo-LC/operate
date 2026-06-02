-- Add snacks_sold (unit count) to location_entries for the snacks challenge metric
ALTER TABLE location_entries
  ADD COLUMN IF NOT EXISTS snacks_sold INTEGER;
