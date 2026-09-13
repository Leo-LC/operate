-- Employee Documents (ID cards, passports, work permits, etc.)
-- Private storage bucket + metadata table with RLS
-- Idempotent: safe to re-run (CREATE IF NOT EXISTS / DROP IF EXISTS).

CREATE TABLE IF NOT EXISTS employee_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id),
  employee_id       UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type          TEXT        NOT NULL DEFAULT 'id_card'
    CHECK (doc_type IN ('id_card', 'passport', 'work_permit', 'contract', 'other')),
  file_name         TEXT        NOT NULL,
  storage_path      TEXT        NOT NULL UNIQUE,
  mime_type         TEXT        NOT NULL,
  size_bytes        INT         NOT NULL,
  created_by        UUID        REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill the FK if the table pre-existed without it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_documents_employee_id_fkey'
  ) THEN
    ALTER TABLE employee_documents
      ADD CONSTRAINT employee_documents_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS employee_documents_employee_idx ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS employee_documents_org_idx ON employee_documents(organization_id);

DROP POLICY IF EXISTS "org members can select employee documents" ON employee_documents;
CREATE POLICY "org members can select employee documents"
  ON employee_documents FOR SELECT
  USING (organization_id = (SELECT id FROM organizations LIMIT 1));

DROP POLICY IF EXISTS "org admins can insert employee documents" ON employee_documents;
CREATE POLICY "org admins can insert employee documents"
  ON employee_documents FOR INSERT
  WITH CHECK (organization_id = (SELECT id FROM organizations LIMIT 1));

DROP POLICY IF EXISTS "org admins can update employee documents" ON employee_documents;
CREATE POLICY "org admins can update employee documents"
  ON employee_documents FOR UPDATE
  USING (organization_id = (SELECT id FROM organizations LIMIT 1));

DROP POLICY IF EXISTS "org admins can delete employee documents" ON employee_documents;
CREATE POLICY "org admins can delete employee documents"
  ON employee_documents FOR DELETE
  USING (organization_id = (SELECT id FROM organizations LIMIT 1));

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-docs',
  'employee-docs',
  false,
  8388608,  -- 8MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: only service role can access (handled server-side via signed URLs)
-- Objects are protected by bucket public=false and server-side API only
