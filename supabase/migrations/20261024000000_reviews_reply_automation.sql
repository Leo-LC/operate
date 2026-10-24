-- Reviews module: reply templates as real rows + auto-reply automation.
--
-- Replaces the shared_config JSON blob (one row holding templates + rules +
-- categories as one JSON document) with proper tables. shared_config itself is
-- left in place but no longer read or written by the app.
--
-- 1. reply_categories  — theme definitions (generic, staff, star_only, …)
-- 2. reply_templates   — one row per template text (rating, category, body)
-- 3. rating_rules      — per-rating reply mode + bulk-send permission
-- 4. reviews_auto_config — singleton switch for the daily auto-reply cron
--
-- All tables are service-role only (no RLS policies): the UI reaches them via
-- owner-guarded API routes, never directly from the browser. Same pattern as
-- cron_runs (20261018000000).

CREATE TABLE IF NOT EXISTS reply_categories (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  ratings     SMALLINT[] NOT NULL DEFAULT '{4,5}',
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reply_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating      SMALLINT NOT NULL CHECK (rating IN (4, 5)),
  category_id TEXT NOT NULL REFERENCES reply_categories(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (length(btrim(body)) > 0),
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rating_rules (
  rating       SMALLINT PRIMARY KEY CHECK (rating BETWEEN 1 AND 5),
  mode         TEXT NOT NULL DEFAULT 'custom' CHECK (mode IN ('template', 'custom')),
  allow_bulk   BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews_auto_config (
  organization_id   UUID PRIMARY KEY REFERENCES organizations(id),
  auto_send_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reply_templates_lookup_idx
  ON reply_templates(category_id, rating, sort_order);

ALTER TABLE reply_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_auto_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE reply_categories    FROM anon, authenticated;
REVOKE ALL ON TABLE reply_templates     FROM anon, authenticated;
REVOKE ALL ON TABLE rating_rules        FROM anon, authenticated;
REVOKE ALL ON TABLE reviews_auto_config FROM anon, authenticated;

-- Seed the base categories + default rules (template for 5/4, custom + no bulk
-- for 1–3). Idempotent so re-applying never duplicates.
INSERT INTO reply_categories (id, label, description, ratings, sort_order) VALUES
  ('generic',     'Generic Positive Experience', 'Safe, all-purpose thank you message for positive experiences.', '{4,5}', 10),
  ('star_only',   'Star-only / No Comment',      'For 4★/5★ reviews that left just stars and no written text.',   '{4,5}', 20),
  ('staff',       'Staff & Service',             'When guests mention friendly or helpful staff.',                 '{4,5}', 30),
  ('animal_care', 'Animals & Interaction',       'When guests comment about the animals and their interaction.',   '{4,5}', 40),
  ('environment', 'Atmosphere & Environment',    'When guests talk about space, vibe, or cleanliness.',            '{4,5}', 50),
  ('family_kids', 'Family & Kids Experience',    'When guests visit with family and children.',                    '{4,5}', 60)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rating_rules (rating, mode, allow_bulk) VALUES
  (5, 'template', true),
  (4, 'template', true),
  (3, 'custom',   false),
  (2, 'custom',   false),
  (1, 'custom',   false)
ON CONFLICT (rating) DO NOTHING;
