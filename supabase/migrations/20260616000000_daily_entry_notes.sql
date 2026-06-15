-- Field-level notes for daily accounting entries
-- Allows attaching a text explanation to any numeric field in a daily_entry

CREATE TABLE daily_entry_notes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_id        UUID        NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  field_name      TEXT        NOT NULL,
  note            TEXT        NOT NULL,
  created_by      UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, field_name)
);

CREATE INDEX idx_daily_entry_notes_entry_id ON daily_entry_notes (entry_id);
CREATE INDEX idx_daily_entry_notes_org ON daily_entry_notes (organization_id);

-- RLS
ALTER TABLE daily_entry_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_entry_notes_org_access"
  ON daily_entry_notes
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
