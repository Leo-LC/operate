-- Permet d'assigner les modules loyverse via admin (loyverse_preview = Shifts & Sales)
ALTER TABLE user_module_access DROP CONSTRAINT IF EXISTS user_module_access_module_key_check;
ALTER TABLE user_module_access ADD CONSTRAINT user_module_access_module_key_check CHECK (
  module_key IN (
    'reviews','documents','animals','schedules','accounting','reports','contacts','attendance','payments','admin','wiki','brand','loyverse','loyverse_preview','challenges','treasury','loyverse-sandbox','customer-insights'
  )
);
