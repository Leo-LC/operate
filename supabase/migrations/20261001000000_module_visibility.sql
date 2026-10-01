-- Global module visibility (owner-controlled release flag).
-- Modules listed here are hidden from everyone except owner until released.
CREATE TABLE IF NOT EXISTS module_visibility (
  module_key TEXT PRIMARY KEY CHECK (module_key IN ('attendance','schedules','treasury')),
  visible BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE module_visibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE module_visibility FROM anon, authenticated;
GRANT ALL ON TABLE module_visibility TO service_role;

-- Seed defaults (masked globally until owner releases)
INSERT INTO module_visibility (module_key, visible) VALUES
  ('attendance', false),
  ('schedules', false),
  ('treasury', false)
ON CONFLICT (module_key) DO NOTHING;
