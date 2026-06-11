-- Add Google Spreadsheet ID to locations for Sheets import feature
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_sheet_id TEXT;

-- Track each import batch so we can show history and revert (delete newly-inserted rows)
CREATE TABLE sheet_import_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  location_id      UUID NOT NULL REFERENCES locations(id),
  imported_by      UUID REFERENCES users(id),
  imported_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  row_count        INTEGER NOT NULL DEFAULT 0,
  entry_ids        UUID[] NOT NULL DEFAULT '{}',
  reverted_at      TIMESTAMPTZ,
  reverted_by      UUID REFERENCES users(id)
);

CREATE INDEX sheet_import_batches_loc_date ON sheet_import_batches(location_id, imported_at DESC);
