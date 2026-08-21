-- Supabase advisor: "Public can see object in GraphQL schema" (lint 0026) and
-- "Signed-in users can see object in GraphQL schema" (lint 0027) for tables
-- created directly in the Supabase console (not via migrations). The app reads
-- and writes these only through the service role key server-side (bypasses
-- RLS), so revoking the default grants from anon/authenticated removes them
-- from the PostgREST / GraphQL schema; service_role keeps full access.

REVOKE ALL ON TABLE payment_challenges      FROM anon, authenticated;
REVOKE ALL ON TABLE shared_config           FROM anon, authenticated;
REVOKE ALL ON TABLE treasury_bank_accounts  FROM anon, authenticated;
REVOKE ALL ON TABLE treasury_cash_positions FROM anon, authenticated;
REVOKE ALL ON TABLE treasury_reserves       FROM anon, authenticated;

GRANT ALL ON TABLE payment_challenges, shared_config, treasury_bank_accounts,
  treasury_cash_positions, treasury_reserves TO service_role;