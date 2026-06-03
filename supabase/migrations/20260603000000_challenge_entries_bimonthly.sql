-- Split location_entries into two periods per month
-- Period 1 = days 1–15, Period 2 = days 16–end
ALTER TABLE location_entries ADD COLUMN IF NOT EXISTS period SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE location_entries DROP CONSTRAINT location_entries_pkey;
ALTER TABLE location_entries ADD PRIMARY KEY (location_id, organization_id, month, period);
