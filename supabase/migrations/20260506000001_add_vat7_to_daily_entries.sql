-- VAT is manually entered by staff (not calculated from a formula)
ALTER TABLE daily_entries
  ADD COLUMN IF NOT EXISTS vat_7 NUMERIC(12,2) NOT NULL DEFAULT 0;
