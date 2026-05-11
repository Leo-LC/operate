ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS company_name_th  TEXT,
  ADD COLUMN IF NOT EXISTS address_th       TEXT,
  ADD COLUMN IF NOT EXISTS tax_id           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS branch           TEXT;
