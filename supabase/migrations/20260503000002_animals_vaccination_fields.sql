ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS last_vaccination_date    DATE,
  ADD COLUMN IF NOT EXISTS next_vaccination_date    DATE,
  ADD COLUMN IF NOT EXISTS vaccination_passport     BOOLEAN NOT NULL DEFAULT false;
