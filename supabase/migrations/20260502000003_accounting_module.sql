-- Accounting module: daily entries per shop + monthly fixed costs

CREATE TABLE IF NOT EXISTS daily_entries (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NOT NULL REFERENCES organizations(id),
  location_id      UUID          NOT NULL REFERENCES locations(id),
  entry_date       DATE          NOT NULL,

  sales_drinks_net        NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_ticket_net        NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_snack_net         NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_goodies_net       NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_card_surcharge    NUMERIC(12,2) NOT NULL DEFAULT 0,

  payment_cash            NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_scan            NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_credit_card     NUMERIC(12,2) NOT NULL DEFAULT 0,

  exp_staff_food_cash     NUMERIC(12,2) NOT NULL DEFAULT 0,
  exp_drinks_cash         NUMERIC(12,2) NOT NULL DEFAULT 0,
  exp_goodies_cash        NUMERIC(12,2) NOT NULL DEFAULT 0,
  exp_animals_cash        NUMERIC(12,2) NOT NULL DEFAULT 0,
  exp_supply_cash         NUMERIC(12,2) NOT NULL DEFAULT 0,
  exp_boss_fees_cash      NUMERIC(12,2) NOT NULL DEFAULT 0,
  exp_other_cash          NUMERIC(12,2) NOT NULL DEFAULT 0,

  exp_makro_bank          NUMERIC(12,2) NOT NULL DEFAULT 0,
  exp_other_bank          NUMERIC(12,2) NOT NULL DEFAULT 0,

  hr_salary_cash          NUMERIC(12,2) NOT NULL DEFAULT 0,
  hr_salary_bank          NUMERIC(12,2) NOT NULL DEFAULT 0,
  hr_challenge_cash       NUMERIC(12,2) NOT NULL DEFAULT 0,
  hr_service_charge_cash  NUMERIC(12,2) NOT NULL DEFAULT 0,
  hr_accompte_cash        NUMERIC(12,2) NOT NULL DEFAULT 0,

  cash_end_day            NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_to_boss            NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_safe               NUMERIC(12,2) NOT NULL DEFAULT 0,

  notes                   TEXT,
  created_by              UUID REFERENCES users(id),
  updated_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_entries_unique UNIQUE (location_id, entry_date)
);

CREATE TABLE IF NOT EXISTS monthly_fixed_costs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID          NOT NULL REFERENCES organizations(id),
  location_id     UUID          NOT NULL REFERENCES locations(id),
  month           TEXT          NOT NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monthly_fixed_costs_unique UNIQUE (location_id, month)
);

ALTER TABLE daily_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS daily_entries_loc_date  ON daily_entries(location_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS daily_entries_org_date  ON daily_entries(organization_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS monthly_fixed_costs_idx ON monthly_fixed_costs(location_id, month);
