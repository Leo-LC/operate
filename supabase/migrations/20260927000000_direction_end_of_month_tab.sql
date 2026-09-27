-- Direction "Fin de mois" (End of Month) tab for Boss — disabled by default.
-- Widens the tab_key check to accept the new tab and seeds it as hidden.
ALTER TABLE IF EXISTS direction_tab_visibility
  DROP CONSTRAINT IF EXISTS direction_tab_visibility_tab_key_check;

ALTER TABLE IF EXISTS direction_tab_visibility
  ADD CONSTRAINT direction_tab_visibility_tab_key_check
  CHECK (tab_key IN ('loyverse', 'overview', 'comparaison', 'daily', 'details', 'end_of_month'));

INSERT INTO direction_tab_visibility (tab_key, visible) VALUES
  ('end_of_month', false)
ON CONFLICT (tab_key) DO NOTHING;
