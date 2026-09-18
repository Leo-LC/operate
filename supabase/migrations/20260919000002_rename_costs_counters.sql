-- Nomenclature coûts & challenges (F) : noms explicites, source unique finance_cost_*.
-- Renomme les tables ; les vues de compatibilité (anciens noms) permettent d'appliquer
-- cette migration AVANT le déploiement du code. À supprimer après validation.
-- Ordre : 1) npx supabase db push  2) déployer le code  3) valider  4) DROP VIEWs.

ALTER TABLE IF EXISTS finance_cost_rules RENAME TO recurring_costs;
ALTER TABLE IF EXISTS finance_cost_actuals RENAME TO recurring_cost_overrides;
ALTER TABLE IF EXISTS finance_cost_categories RENAME TO recurring_cost_categories;
ALTER TABLE IF EXISTS location_entries RENAME TO challenge_counters;

COMMENT ON TABLE recurring_costs IS 'Coûts récurrents par shop (règles mensuelles). Source unique — remplace monthly_fixed_*.';
COMMENT ON TABLE recurring_cost_overrides IS 'Réel du mois qui écrase l''estimé (recurring_costs.estimated_amount).';
COMMENT ON TABLE challenge_counters IS 'Compteurs challenges P1/P2/P3 (entry_count, snacks_sold). Source de vérité : Loyverse (sync force=true), override owner uniquement.';

-- ── Vues de compatibilité (anciens noms) — DROP après validation ─────────────
CREATE OR REPLACE VIEW location_entries WITH (security_invoker = true) AS SELECT * FROM challenge_counters;
CREATE OR REPLACE VIEW finance_cost_rules WITH (security_invoker = true) AS SELECT * FROM recurring_costs;
CREATE OR REPLACE VIEW finance_cost_actuals WITH (security_invoker = true) AS SELECT * FROM recurring_cost_overrides;
CREATE OR REPLACE VIEW finance_cost_categories WITH (security_invoker = true) AS SELECT * FROM recurring_cost_categories;
