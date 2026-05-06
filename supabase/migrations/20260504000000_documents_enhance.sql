-- Combined: add reference columns (code/category/frequency), seed 36 docs per location,
-- plus enhancement columns (authority, thai_form_name, is_relevant, has_document, etc.)
-- NOTE: supersedes 20260503000010_seed_reference_documents.sql which was never applied to prod.
-- Applied to Supabase as migration "documents_reference_and_enhance".

-- Base reference columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS code      TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category  TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS frequency TEXT;

-- Enhancement columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS thai_form_name         TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS authority              TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_relevant            BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS has_document           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reminder_days_override INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS shop_notes             TEXT;

-- Unique index: one row per location + code (idempotent seed)
CREATE UNIQUE INDEX IF NOT EXISTS documents_ref_code_uq
  ON documents(location_id, code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

-- Seed 36 reference documents for every active location
DO $$
DECLARE
  loc RECORD;
  org_id CONSTANT UUID := 'a1b2c3d4-0000-0000-0000-000000000001';
BEGIN
  FOR loc IN
    SELECT id FROM locations
    WHERE organization_id = org_id AND is_active = true
  LOOP
    INSERT INTO documents
      (organization_id, location_id, title, code, category, document_type, frequency, authority, thai_form_name, status)
    VALUES
      (org_id, loc.id, 'DBD - Company Registration Certificate', 'DBD_CERT',           'Corporate',          'legal',       'Once',           'Department of Business Development (DBD)', 'หนังสือรับรองบริษัท',        'missing'),
      (org_id, loc.id, 'VAT Registration',                       'PP20',                'Tax & Finance',      'other',       'Once',           'Revenue Department',                       'แบบ ภ.พ.20',                 'missing'),
      (org_id, loc.id, 'VAT Filing',                             'PP30',                'Tax & Finance',      'other',       'Monthly',        'Revenue Department',                       'แบบ ภ.พ.30',                 'missing'),
      (org_id, loc.id, 'Withholding Tax Filing (PND3)',           'PND3',               'Tax & Finance',      'other',       'Monthly',        'Revenue Department',                       'แบบ ภ.ง.ด.3',                'missing'),
      (org_id, loc.id, 'Withholding Tax Filing (PND53)',          'PND53',              'Tax & Finance',      'other',       'Monthly',        'Revenue Department',                       'แบบ ภ.ง.ด.53',               'missing'),
      (org_id, loc.id, 'Corporate Tax Filing',                   'PND50',               'Tax & Finance',      'other',       'Yearly',         'Revenue Department',                       'แบบ ภ.ง.ด.50',               'missing'),
      (org_id, loc.id, 'Half-Year Corporate Tax',                'PND51',               'Tax & Finance',      'other',       'Half-yearly',    'Revenue Department',                       'แบบ ภ.ง.ด.51',               'missing'),
      (org_id, loc.id, 'Signboard Tax Filing',                   'PP1',                 'Tax & Finance',      'other',       'Yearly',         'Revenue Department',                       NULL,                         'missing'),
      (org_id, loc.id, 'SSO Employer Registration',              'SPS101',              'HR & Immigration',   'hr',          'Once',           'Social Security Office',                   'แบบ สปส.1-01',               'missing'),
      (org_id, loc.id, 'SSO Employee Registration',              'SPS103',              'HR & Immigration',   'hr',          'Once',           'Social Security Office',                   'แบบ สปส.1-03',               'missing'),
      (org_id, loc.id, 'SSO Monthly Contribution',               'SPS110',              'HR & Immigration',   'hr',          'Monthly',        'Social Security Office',                   'แบบ สปส.1-10',               'missing'),
      (org_id, loc.id, 'Work Permit',                            'WORK_PERMIT',         'HR & Immigration',   'hr',          'Yearly',         'Department of Employment',                 'ใบอนุญาตทำงาน',              'missing'),
      (org_id, loc.id, 'Work Permit Application',                'WP_APP',              'HR & Immigration',   'hr',          'One-time',       'Department of Employment',                 NULL,                         'missing'),
      (org_id, loc.id, 'Visa (Non-Immigrant B)',                 'NON_B',               'HR & Immigration',   'hr',          'Case-by-case',   'Immigration Bureau',                       NULL,                         'missing'),
      (org_id, loc.id, 'Visa Extension',                         'TM7',                 'HR & Immigration',   'hr',          'Yearly',         'Immigration Bureau',                       'ตม.7',                       'missing'),
      (org_id, loc.id, '90-Day Report',                          'TM47',                'HR & Immigration',   'hr',          'Every 90 days',  'Immigration Bureau',                       'ตม.47',                      'missing'),
      (org_id, loc.id, 'Re-Entry Permit',                        'TM8',                 'HR & Immigration',   'hr',          'Case-by-case',   'Immigration Bureau',                       'ตม.8',                       'missing'),
      (org_id, loc.id, 'Lease Agreement',                        'LEASE',               'Lease & Property',   'contract',    'Case-by-case',   'District Office',                          NULL,                         'missing'),
      (org_id, loc.id, 'House Registration',                     'HOUSE_REG',           'Lease & Property',   'contract',    'Once',           'District Office',                          NULL,                         'missing'),
      (org_id, loc.id, 'Land Title',                             'LAND_TITLE',          'Lease & Property',   'contract',    'Once',           'Department of Lands',                      NULL,                         'missing'),
      (org_id, loc.id, 'Restaurant License',                     'FOOD_LICENSE',        'Licenses & Ops',     'license',     'Yearly',         'District Office',                          'ใบอนุญาตประกอบการร้านอาหาร', 'missing'),
      (org_id, loc.id, 'Food Handling Certificate',              'FOOD_HANDLER_CARD',   'Licenses & Ops',     'license',     'Every 3 years',  'District Office',                          NULL,                         'missing'),
      (org_id, loc.id, 'Health Inspection Report',               'SANITATION_REPORT',   'Licenses & Ops',     'license',     'Case-by-case',   'District Office',                          NULL,                         'missing'),
      (org_id, loc.id, 'Health Risk Business Permit',            'HEALTH_RISK_PERMIT',  'Licenses & Ops',     'license',     'Yearly',         'District Office',                          NULL,                         'missing'),
      (org_id, loc.id, 'Alcohol License',                        'ALCOHOL_LICENSE',     'Licenses & Ops',     'license',     'Yearly',         'Excise Department',                        'ใบอนุญาตขายสุรา',            'missing'),
      (org_id, loc.id, 'Animal Possession Permit',               'ANIMAL_POSSESSION',   'Animal Compliance',  'permit',      'Case-by-case',   'Department of Livestock Development',      'ใบอนุญาตครอบครองสัตว์',     'missing'),
      (org_id, loc.id, 'Animal Import Permit',                   'R7',                  'Animal Compliance',  'permit',      'One-time',       'Department of Livestock Development',      'ร.7',                        'missing'),
      (org_id, loc.id, 'Animal Health Certificate',              'ANIMAL_HEALTH_CERT',  'Animal Compliance',  'permit',      'Case-by-case',   'Veterinarian',                             NULL,                         'missing'),
      (org_id, loc.id, 'Veterinary Inspection',                  'VET_INSPECTION',      'Animal Compliance',  'permit',      'Case-by-case',   'Veterinarian',                             NULL,                         'missing'),
      (org_id, loc.id, 'Animal Vaccination Record',              'ANIMAL_VACCINE',      'Animal Compliance',  'permit',      'Case-by-case',   'Veterinarian',                             NULL,                         'missing'),
      (org_id, loc.id, 'Fire Safety Certificate',                'FIRE_SAFETY',         'Safety & Building',  'certificate', 'Case-by-case',   'Local Fire Authority',                     NULL,                         'missing'),
      (org_id, loc.id, 'Building Permit',                        'BUILDING_PERMIT',     'Safety & Building',  'certificate', 'Once',           'Local Authority',                          NULL,                         'missing'),
      (org_id, loc.id, 'Building Inspection',                    'BUILDING_INSPECTION', 'Safety & Building',  'certificate', 'Case-by-case',   'Local Authority',                          NULL,                         'missing'),
      (org_id, loc.id, 'Extinguisher Servicing',                 'EXTINGUISHER_SERVICE','Safety & Building',  'certificate', 'Yearly',         'Local Authority',                          NULL,                         'missing'),
      (org_id, loc.id, 'Public Liability Insurance',             'PUBLIC_LIABILITY_INS','Insurance',           'insurance',   'Yearly',         'Insurance Company',                        NULL,                         'missing'),
      (org_id, loc.id, 'Property Insurance',                     'PROPERTY_INS',        'Insurance',           'insurance',   'Yearly',         'Insurance Company',                        NULL,                         'missing')
    ON CONFLICT (location_id, code) WHERE code IS NOT NULL AND deleted_at IS NULL
    DO NOTHING;
  END LOOP;
END;
$$;
