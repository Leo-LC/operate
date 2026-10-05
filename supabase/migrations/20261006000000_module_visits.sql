-- Daily module-visit rollup: one row per (user, module, day).
-- Powers the Admin "Activity" tab (today feed + 30-day GitHub-style grid).
CREATE TABLE IF NOT EXISTS module_visits (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  module_key   TEXT        NOT NULL,
  visited_on   DATE        NOT NULL DEFAULT CURRENT_DATE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_count  INT         NOT NULL DEFAULT 1,
  CONSTRAINT module_visits_unique UNIQUE (user_id, module_key, visited_on)
);

CREATE INDEX IF NOT EXISTS module_visits_visited_on_idx ON module_visits(visited_on DESC);
CREATE INDEX IF NOT EXISTS module_visits_user_idx ON module_visits(user_id);

ALTER TABLE module_visits ENABLE ROW LEVEL SECURITY;
