-- Dérivé des receipts: sales by category / by item par jour/store (Bangkok)
-- Loyverse n'a pas d'endpoint pré-agrégé "sales by category" -> on flatten line_items des receipts
-- Garde-fou: une fois archivé, un jour fermé (< today) n'est jamais re-fetché

CREATE TABLE IF NOT EXISTS loyverse_daily_sales (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key         TEXT        NOT NULL,
  store_id            TEXT        NOT NULL,
  location_id         UUID        REFERENCES locations(id) ON DELETE SET NULL,
  date                DATE        NOT NULL,
  sales_by_category   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  sales_by_item       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  receipt_count       INTEGER     NOT NULL DEFAULT 0,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyverse_daily_sales_unique UNIQUE (account_key, store_id, date)
);

CREATE INDEX IF NOT EXISTS loyverse_daily_sales_date_idx ON loyverse_daily_sales(date DESC);
CREATE INDEX IF NOT EXISTS loyverse_daily_sales_store_date_idx ON loyverse_daily_sales(store_id, date DESC);
CREATE INDEX IF NOT EXISTS loyverse_daily_sales_account_date_idx ON loyverse_daily_sales(account_key, date DESC);
CREATE INDEX IF NOT EXISTS loyverse_daily_sales_location_idx ON loyverse_daily_sales(location_id, date DESC) WHERE location_id IS NOT NULL;

ALTER TABLE loyverse_daily_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyverse_daily_sales_owner_select" ON loyverse_daily_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'owner'
    )
  );

COMMENT ON TABLE loyverse_daily_sales IS 'Agrégats sales by category/item dérivés des receipts Loyverse par jour/store (Bangkok). Alimenté par cron loyverse-sync, garde-fou jour fermé.';
COMMENT ON COLUMN loyverse_daily_sales.sales_by_category IS 'Array {category_id, category_name, quantity, total_money} trié par total desc';
COMMENT ON COLUMN loyverse_daily_sales.sales_by_item IS 'Array {item_id, item_name, category_id, category_name, quantity, total_money} trié par total desc';
