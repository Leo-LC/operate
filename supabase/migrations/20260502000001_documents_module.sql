-- Documents tracking module
-- Drive files stay in Google Drive; this table stores metadata + expiry tracking.

CREATE TABLE IF NOT EXISTS documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id),
  location_id       UUID        REFERENCES locations(id),
  title             TEXT        NOT NULL,
  document_type     TEXT        NOT NULL DEFAULT 'other',
  status            TEXT        NOT NULL DEFAULT 'valid',
  drive_url         TEXT,
  issued_at         DATE,
  expires_at        DATE,
  responsible_person TEXT,
  notes             TEXT,
  last_checked_at   TIMESTAMPTZ,
  created_by        UUID        REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT documents_status_check CHECK (
    status IN ('valid', 'expiring', 'expired', 'missing', 'to_review', 'replaced', 'archived')
  ),
  CONSTRAINT documents_type_check CHECK (
    document_type IN ('permit', 'license', 'certificate', 'contract', 'insurance', 'health', 'legal', 'hr', 'other')
  )
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS documents_org_idx      ON documents(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS documents_location_idx  ON documents(location_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS documents_expires_idx   ON documents(expires_at)     WHERE deleted_at IS NULL;
