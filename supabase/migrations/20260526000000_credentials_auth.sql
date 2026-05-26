-- Store Google OAuth tokens at the organization level so reviews work regardless of who is logged in
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at BIGINT;

-- Password-based auth for staff users (bcrypt hash)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
