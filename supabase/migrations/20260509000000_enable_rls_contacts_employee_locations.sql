-- Enable RLS on tables flagged by Supabase advisor
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_locations ENABLE ROW LEVEL SECURITY;

-- contacts: org-scoped access via service role (all server-side API routes use service role key)
-- Direct client access is restricted to authenticated users within the same organization

CREATE POLICY "contacts_org_access" ON contacts
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "contact_locations_org_access" ON contact_locations
  FOR ALL
  USING (
    contact_id IN (
      SELECT id FROM contacts
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "employee_locations_org_access" ON employee_locations
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );
