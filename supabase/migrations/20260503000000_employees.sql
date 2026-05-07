-- Employees module
-- Tracks shop-level staff independently from app users (who have login accounts).
-- An employee can optionally be linked to a user account via user_id.

CREATE TABLE IF NOT EXISTS employees (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID         NOT NULL REFERENCES organizations(id),
  location_id      UUID         REFERENCES locations(id),
  first_name       TEXT         NOT NULL,
  last_name        TEXT         NOT NULL,
  position         TEXT,
  email            TEXT,
  phone            TEXT,
  active           BOOLEAN      NOT NULL DEFAULT true,
  notes            TEXT,
  user_id          UUID         REFERENCES users(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS employees_org_idx      ON employees(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS employees_location_idx ON employees(location_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS employees_active_idx   ON employees(active)         WHERE deleted_at IS NULL;
