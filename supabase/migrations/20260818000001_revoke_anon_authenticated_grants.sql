-- Supabase advisor: "Public can see object in GraphQL schema" (lint 0026) and the
-- matching signed-in-user exposure (lint 0027). The app reads/writes these tables
-- only via the service role key server-side, which bypasses RLS. Revoking the
-- default grants from anon/authenticated keeps the objects out of the PostgREST
-- / GraphQL schema entirely; service_role keeps full access.

-- Platform foundation
REVOKE ALL ON TABLE organizations        FROM anon, authenticated;
REVOKE ALL ON TABLE locations            FROM anon, authenticated;
REVOKE ALL ON TABLE users                FROM anon, authenticated;
REVOKE ALL ON TABLE user_module_access   FROM anon, authenticated;
REVOKE ALL ON TABLE user_location_access FROM anon, authenticated;
REVOKE ALL ON TABLE audit_logs           FROM anon, authenticated;

-- Documents
REVOKE ALL ON TABLE documents            FROM anon, authenticated;

-- Animals
REVOKE ALL ON TABLE animals              FROM anon, authenticated;
REVOKE ALL ON TABLE animal_events        FROM anon, authenticated;

-- Accounting
REVOKE ALL ON TABLE daily_entries        FROM anon, authenticated;
REVOKE ALL ON TABLE monthly_fixed_costs  FROM anon, authenticated;
REVOKE ALL ON TABLE daily_entry_notes    FROM anon, authenticated;

-- Employees / HR / attendance / payments
REVOKE ALL ON TABLE employees            FROM anon, authenticated;
REVOKE ALL ON TABLE employee_locations   FROM anon, authenticated;
REVOKE ALL ON TABLE employee_payment_records FROM anon, authenticated;
REVOKE ALL ON TABLE hr_settings          FROM anon, authenticated;
REVOKE ALL ON TABLE attendance_records   FROM anon, authenticated;
REVOKE ALL ON TABLE payment_adjustments  FROM anon, authenticated;

-- Schedules
REVOKE ALL ON TABLE schedules            FROM anon, authenticated;
REVOKE ALL ON TABLE schedule_shifts      FROM anon, authenticated;

-- Fixed expenses
REVOKE ALL ON TABLE fixed_expense_categories FROM anon, authenticated;
REVOKE ALL ON TABLE monthly_fixed_expenses   FROM anon, authenticated;

-- Contacts
REVOKE ALL ON TABLE contacts             FROM anon, authenticated;
REVOKE ALL ON TABLE contact_locations    FROM anon, authenticated;

-- Wiki
REVOKE ALL ON TABLE wiki_categories      FROM anon, authenticated;
REVOKE ALL ON TABLE wiki_pages           FROM anon, authenticated;
REVOKE ALL ON TABLE wiki_roles           FROM anon, authenticated;

-- Google Sheets import
REVOKE ALL ON TABLE sheet_import_batches FROM anon, authenticated;
REVOKE ALL ON TABLE sheet_sync_config    FROM anon, authenticated;

-- Finance (people navigation / daily PL alpha)
REVOKE ALL ON TABLE finance_legal_entities       FROM anon, authenticated;
REVOKE ALL ON TABLE finance_location_assignments FROM anon, authenticated;
REVOKE ALL ON TABLE finance_sheet_entries        FROM anon, authenticated;
REVOKE ALL ON TABLE finance_sheet_revisions      FROM anon, authenticated;
REVOKE ALL ON TABLE finance_payroll_overrides    FROM anon, authenticated;
REVOKE ALL ON TABLE finance_sync_config          FROM anon, authenticated;
REVOKE ALL ON TABLE finance_adjustments          FROM anon, authenticated;

-- Challenges (created in the Supabase console, so not in a migration)
REVOKE ALL ON TABLE app_settings        FROM anon, authenticated;
REVOKE ALL ON TABLE location_entries    FROM anon, authenticated;
REVOKE ALL ON TABLE location_gbp_ratings FROM anon, authenticated;
REVOKE ALL ON TABLE reviews_cache       FROM anon, authenticated;

-- Views (ON TABLE applies to views as well; ON VIEW trips the query parser here)
REVOKE ALL ON TABLE monthly_revenue_by_location FROM anon, authenticated;

-- Service role keeps full access to everything above (it bypasses RLS, so this
-- is a formality matching the existing finance migrations).
GRANT ALL ON TABLE organizations, locations, users, user_module_access,
  user_location_access, audit_logs, documents, animals, animal_events,
  daily_entries, monthly_fixed_costs, daily_entry_notes, employees,
  employee_locations, employee_payment_records, hr_settings, attendance_records,
  payment_adjustments, schedules, schedule_shifts, fixed_expense_categories,
  monthly_fixed_expenses, contacts, contact_locations, wiki_categories,
  wiki_pages, wiki_roles, sheet_import_batches, sheet_sync_config,
  finance_legal_entities, finance_location_assignments, finance_sheet_entries,
  finance_sheet_revisions, finance_payroll_overrides, finance_sync_config,
  finance_adjustments, app_settings, location_entries, location_gbp_ratings,
  reviews_cache TO service_role;

GRANT ALL ON TABLE monthly_revenue_by_location TO service_role;