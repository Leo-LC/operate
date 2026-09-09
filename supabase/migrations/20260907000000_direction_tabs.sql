-- Direction tabs visibility for Boss (shared across browsers)
CREATE TABLE IF NOT EXISTS direction_tab_visibility (
  tab_key TEXT PRIMARY KEY CHECK (tab_key IN ('loyverse','overview','comparaison','daily','details')),
  visible BOOLEAN NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE direction_tab_visibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE direction_tab_visibility FROM anon, authenticated;
GRANT ALL ON TABLE direction_tab_visibility TO service_role;

-- Seed defaults (boss sees only 3 tabs)
INSERT INTO direction_tab_visibility (tab_key, visible) VALUES
  ('loyverse', true),
  ('overview', true),
  ('comparaison', true),
  ('daily', false),
  ('details', false)
ON CONFLICT (tab_key) DO NOTHING;
