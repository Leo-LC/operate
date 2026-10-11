-- Loyverse accounts registry (Oct 2026): move POS tokens out of Vercel env "Secrets".
--
-- Problem: LOYVERSE_ACCOUNTS lived in Vercel env vars set as Secrets, so values
-- are write-only in the dashboard (no read-back). Any add/edit was blind.
-- Fix: store accounts in this table, editable via owner-only UI/API.
-- Env (LOYVERSE_ACCOUNTS / LOYVERSE_ACCESS_TOKEN) stays as fallback/merge source
-- in src/lib/loyverse/accounts.ts during the transition.
--
-- Security: RLS enabled with NO policies for anon/authenticated roles, so only
-- the service-role key (server-side, src/lib/supabase-server.ts) can read the
-- tokens. The public API (/api/loyverse/accounts) never returns full tokens,
-- only key/label/is_active + masked last-4 for identification.

CREATE TABLE IF NOT EXISTS loyverse_accounts (
  key        TEXT        PRIMARY KEY CHECK (key ~ '^[a-z0-9_-]+$'),
  label      TEXT        NOT NULL,
  token      TEXT        NOT NULL CHECK (char_length(token) > 0),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE loyverse_accounts ENABLE ROW LEVEL SECURITY;

-- No policies: anon + authenticated get nothing. Service role bypasses RLS.

COMMENT ON TABLE loyverse_accounts IS 'Loyverse POS accounts registry (replaces blind Vercel LOYVERSE_ACCOUNTS secret). Tokens readable server-side only via service role.';
COMMENT ON COLUMN loyverse_accounts.key IS 'Internal account key, e.g. laguna / pattaya. Matches locations.loyverse_account_key and snapshot account_key.';
COMMENT ON COLUMN loyverse_accounts.token IS 'Loyverse Personal Access Token. Never exposed via API; only last-4 masked in admin UI.';
