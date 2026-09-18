-- Directory (Annuaire opérationnel) : fiches shops + fournisseurs enrichis
-- Phase 1 : colonnes opérationnelles sur locations
-- Phase 2 : catalogue produits + historique commandes fournisseurs + canaux contact

-- ── 1. locations : fiche shop unifiée ──
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS line_id          TEXT,
  ADD COLUMN IF NOT EXISTS address_en       TEXT,
  ADD COLUMN IF NOT EXISTS address_th       TEXT,
  ADD COLUMN IF NOT EXISTS company_name_th  TEXT,
  ADD COLUMN IF NOT EXISTS tax_id           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS branch           TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours    TEXT,
  ADD COLUMN IF NOT EXISTS manager_name     TEXT,
  ADD COLUMN IF NOT EXISTS notes            TEXT;

-- ── 2. contacts : canaux fournisseurs ──
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS line_id            TEXT,
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms      TEXT,
  ADD COLUMN IF NOT EXISTS lead_time_days    INT;

-- ── 3. supplier_products : catalogue par fournisseur ──
CREATE TABLE IF NOT EXISTS supplier_products (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id),
  contact_id      UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  product_name    TEXT        NOT NULL,
  unit            TEXT,
  notes           TEXT,
  created_by      UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_products_contact_idx ON supplier_products(contact_id);
CREATE INDEX IF NOT EXISTS supplier_products_org_idx ON supplier_products(organization_id);

-- ── 4. supplier_orders : log manuel des commandes (date + produit + prix) ──
CREATE TABLE IF NOT EXISTS supplier_orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id),
  contact_id      UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  product_name    TEXT        NOT NULL,
  qty             NUMERIC,
  unit            TEXT,
  unit_price      NUMERIC     NOT NULL,
  total           NUMERIC,
  ordered_at      DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_orders_contact_idx ON supplier_orders(contact_id);
CREATE INDEX IF NOT EXISTS supplier_orders_org_date_idx ON supplier_orders(organization_id, ordered_at DESC);

-- ── 5. RLS (accès via service-role côté serveur, comme contacts) ──
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders   ENABLE ROW LEVEL SECURITY;
