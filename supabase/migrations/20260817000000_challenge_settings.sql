-- Configurable challenge sales-target thresholds.
-- One row per shop, keyed by the normalized location name used by the
-- challenges module (e.g. 'samui', 'ekkamai', 'silom', 'pattaya',
-- 'chiang mai', 'phangan'). Empty table = use the code defaults; storing
-- a row overrides the default for that shop. Delete the row to reset.

CREATE TABLE IF NOT EXISTS challenge_settings (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID         NOT NULL REFERENCES organizations(id),
  location_key      TEXT         NOT NULL,
  revenue_threshold NUMERIC(12,2) NOT NULL,
  created_by        UUID         REFERENCES users(id),
  updated_by        UUID         REFERENCES users(id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT challenge_settings_org_key_unique UNIQUE (organization_id, location_key)
);

CREATE INDEX IF NOT EXISTS challenge_settings_org_key_idx
  ON challenge_settings (organization_id, location_key);

ALTER TABLE challenge_settings ENABLE ROW LEVEL SECURITY;

-- Written only through authenticated backend routes.
REVOKE ALL ON TABLE challenge_settings FROM anon, authenticated;
GRANT ALL ON TABLE challenge_settings TO service_role;