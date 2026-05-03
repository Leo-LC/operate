-- Platform foundation: organizations, locations, users, permissions, audit logs
-- Safe to apply alongside existing app — does NOT touch shared_config or scheduling tables.

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

-- 2. Locations per organization
CREATE TABLE IF NOT EXISTS locations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id),
  name            TEXT        NOT NULL,
  slug            TEXT        NOT NULL,
  external_id     TEXT,                    -- e.g. Google Business location ID
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT locations_org_slug_unique UNIQUE (organization_id, slug)
);

-- 3. Platform users (linked by email to NextAuth identity)
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL,
  name            TEXT,
  global_role     TEXT        NOT NULL DEFAULT 'member',
  organization_id UUID        REFERENCES organizations(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_global_role_check CHECK (global_role IN ('owner', 'admin', 'member'))
);

-- 4. Which modules each user can access
CREATE TABLE IF NOT EXISTS user_module_access (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_key TEXT        NOT NULL,
  can_read   BOOLEAN     NOT NULL DEFAULT true,
  can_write  BOOLEAN     NOT NULL DEFAULT false,
  granted_by UUID        REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_module_access_unique UNIQUE (user_id, module_key),
  CONSTRAINT user_module_access_module_key_check CHECK (
    module_key IN ('reviews', 'documents', 'animals', 'schedules', 'accounting', 'reports', 'admin')
  )
);

-- 5. Which locations each user can access
CREATE TABLE IF NOT EXISTS user_location_access (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id UUID        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  granted_by  UUID        REFERENCES users(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_location_access_unique UNIQUE (user_id, location_id)
);

-- 6. Audit logs (for sensitive module operations)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id),
  action      TEXT        NOT NULL,
  module_key  TEXT,
  entity_type TEXT,
  entity_id   UUID,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all new tables.
-- The app uses the service role key server-side, which bypasses RLS.
-- Explicit policies for anon/authenticated roles will be added when needed.
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_access   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
