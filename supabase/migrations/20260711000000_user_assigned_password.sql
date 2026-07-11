-- Store owner-assigned passwords in encrypted form for later retrieval (login still uses password_hash).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS assigned_password_encrypted TEXT;
