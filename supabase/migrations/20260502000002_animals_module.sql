-- Animals tracking module
-- Centralizes animal records and health event timelines.

CREATE TABLE IF NOT EXISTS animals (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID        NOT NULL REFERENCES organizations(id),
  location_id          UUID        REFERENCES locations(id),
  name                 TEXT        NOT NULL,
  species              TEXT        NOT NULL DEFAULT 'capybara',
  sex                  TEXT,
  status               TEXT        NOT NULL DEFAULT 'active',
  estimated_birth_date DATE,
  arrival_date         DATE,
  microchip_id         TEXT,
  notes                TEXT,
  created_by           UUID        REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,
  CONSTRAINT animals_status_check CHECK (
    status IN ('active','observation','quarantine','sick','transferred','retired','deceased','archived')
  ),
  CONSTRAINT animals_sex_check CHECK (sex IN ('male','female','unknown') OR sex IS NULL)
);

CREATE TABLE IF NOT EXISTS animal_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id   UUID        NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL DEFAULT 'note',
  event_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  title       TEXT        NOT NULL,
  notes       TEXT,
  created_by  UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT animal_events_type_check CHECK (
    event_type IN ('health_check','vet_visit','vaccine','transfer','feeding_note','incident','note','other')
  )
);

ALTER TABLE animals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS animals_org_idx      ON animals(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS animals_location_idx ON animals(location_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS animal_events_animal ON animal_events(animal_id, event_date DESC);
