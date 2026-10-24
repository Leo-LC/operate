-- Détail par prix tapé, par article et par jour (onglet Analyse).
-- Loyverse conserve unit_price par ligne de receipt ; les agrégats journaliers
-- agressaient tout sous la seule ligne { item_name, q, m }. On ajoute une
-- colonne prices_by_item : { [item_name]: [{ p, n, q, m }] } — p = prix unitaire
-- tapé (฿), n = nb de lignes (~transactions), q = unités (signé, REFUND inclus),
-- m = total (signé). Rétro-compatible : les autres lecteurs de sales_by_item
-- ne lisent pas cette colonne.

ALTER TABLE loyverse_daily_sales
  ADD COLUMN IF NOT EXISTS prices_by_item JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN loyverse_daily_sales.prices_by_item IS 'Detail par prix : { item_name: [{ p, n, q, m } trie par p asc] }, derive des unit_price des receipts au sync (absent pour l historique precedent le 2026-10-24, rempli par le backfill script);';
