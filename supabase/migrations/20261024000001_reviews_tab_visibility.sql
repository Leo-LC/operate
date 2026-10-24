-- Reviews module tab visibility (shared across browsers, toggled by owners
-- via the eye icon in ReviewsTabNav — same pattern as direction_tab_visibility).
CREATE TABLE IF NOT EXISTS reviews_tab_visibility (
  tab_key TEXT PRIMARY KEY CHECK (tab_key IN ('stats')),
  visible BOOLEAN NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reviews_tab_visibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE reviews_tab_visibility FROM anon, authenticated;
GRANT ALL ON TABLE reviews_tab_visibility TO service_role;
