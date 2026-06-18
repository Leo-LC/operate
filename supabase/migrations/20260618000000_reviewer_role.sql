-- Add "reviewer" global role: a user with this role gets locked, read+write
-- access to the reviews module only, regardless of any user_module_access rows.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_global_role_check;
ALTER TABLE users ADD CONSTRAINT users_global_role_check
  CHECK (global_role IN ('owner', 'admin', 'member', 'reviewer'));
