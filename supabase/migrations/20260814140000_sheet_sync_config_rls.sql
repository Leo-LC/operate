-- Ensure sheet_sync_config exists (previously created only in the Supabase console).
-- Schema matches the live table exactly so this is a no-op on existing databases.
CREATE TABLE IF NOT EXISTS sheet_sync_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  TEXT NOT NULL,
  enabled          BOOLEAN NOT NULL DEFAULT false,
  last_run_at      TIMESTAMPTZ,
  last_run_result  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The code reads this table with .eq("organization_id", ...).single(), so the
-- organization must be unique. Deduplicate any pre-existing rows before adding
-- the constraint (keeps the most recently updated row per organization).
DELETE FROM sheet_sync_config a
USING sheet_sync_config b
WHERE a.organization_id = b.organization_id
  AND (a.updated_at, a.id) < (b.updated_at, b.id);

ALTER TABLE sheet_sync_config ADD CONSTRAINT sheet_sync_config_organization_id_key UNIQUE (organization_id);

-- Enable the daily automated import for the default organization.
INSERT INTO sheet_sync_config (id, organization_id, enabled, updated_at)
VALUES (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', true, now())
ON CONFLICT (organization_id) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      updated_at = now();

-- Row Level Security: table is only ever accessed server-side via the service
-- role (bypasses RLS). Policies below grant read/update to authenticated owners
-- as defense in depth, so the anon key cannot touch the config.
ALTER TABLE sheet_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sheet_sync_config_owner_select" ON sheet_sync_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'owner'
        AND u.organization_id::text = sheet_sync_config.organization_id
    )
  );

CREATE POLICY "sheet_sync_config_owner_update" ON sheet_sync_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'owner'
        AND u.organization_id::text = sheet_sync_config.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'owner'
        AND u.organization_id::text = sheet_sync_config.organization_id
    )
  );
