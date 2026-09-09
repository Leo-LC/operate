-- Allow "direction" role and "direction" module to be assigned via admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_global_role_check;
ALTER TABLE users ADD CONSTRAINT users_global_role_check
  CHECK (global_role IN ('owner', 'admin', 'member', 'reviewer', 'direction'));

ALTER TABLE user_module_access DROP CONSTRAINT IF EXISTS user_module_access_module_key_check;
ALTER TABLE user_module_access ADD CONSTRAINT user_module_access_module_key_check CHECK (
  module_key IN (
    'reviews','documents','animals','schedules','accounting','reports','contacts','attendance','payments','admin','wiki','brand','loyverse','loyverse_preview','challenges','treasury','loyverse-sandbox','customer-insights','direction'
  )
);
