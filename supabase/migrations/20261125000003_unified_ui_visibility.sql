-- Unified UI visibility ("eye") gating.
-- One row per maskable UI element in module_visibility:
--   - 'module:<nav-item-id>'   → a sidebar entry (and its route)
--   - 'tab:<module>.<tab-key>' → a tab in a module tab bar
-- Missing row = visible. visible = false masks the element for
-- member/reviewer/direction/staff; owner/admin still see it (dimmed).
-- Only owners can toggle (POST /api/admin/module-visibility).

-- Widen the key constraint from the 3 legacy hard-coded modules to generic keys.
-- Drop first so the UPDATE below can move rows to the prefixed key scheme.
ALTER TABLE module_visibility DROP CONSTRAINT module_visibility_module_key_check;

-- Legacy sidebar gate rows move to the prefixed key scheme.
UPDATE module_visibility SET module_key = 'module:attendance' WHERE module_key = 'attendance';
UPDATE module_visibility SET module_key = 'module:scheduling' WHERE module_key = 'schedules';
UPDATE module_visibility SET module_key = 'module:treasury'   WHERE module_key = 'treasury';

ALTER TABLE module_visibility
  ADD CONSTRAINT module_visibility_module_key_check
  CHECK (module_key ~ '^(module|tab):[a-z0-9][a-z0-9._-]*$');

-- Migrate Direction tabs into the unified table.
INSERT INTO module_visibility (module_key, visible, updated_by, updated_at)
SELECT 'tab:direction.' || tab_key, visible, updated_by, updated_at
FROM direction_tab_visibility
ON CONFLICT (module_key) DO UPDATE
  SET visible = EXCLUDED.visible, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;

-- Migrate Reviews tabs into the unified table.
INSERT INTO module_visibility (module_key, visible, updated_by, updated_at)
SELECT 'tab:reviews.' || tab_key, visible, updated_by, updated_at
FROM reviews_tab_visibility
ON CONFLICT (module_key) DO UPDATE
  SET visible = EXCLUDED.visible, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;

-- The per-module tab tables are replaced by module_visibility.
DROP TABLE IF EXISTS direction_tab_visibility;
DROP TABLE IF EXISTS reviews_tab_visibility;
