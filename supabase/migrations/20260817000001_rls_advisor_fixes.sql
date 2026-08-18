-- Supabase Advisor fixes (6 issues)
-- App queries these tables only via the service role key (bypasses RLS);
-- enabling RLS blocks direct anon/user JWT access as defense in depth.

ALTER TABLE sheet_import_batches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_cache          ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_gbp_ratings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_entries       ENABLE ROW LEVEL SECURITY;

-- Make the view respect the invoking user's permissions/RLS instead of
-- running with the view owner's (definer) rights.
ALTER VIEW monthly_revenue_by_location SET (security_invoker = true);