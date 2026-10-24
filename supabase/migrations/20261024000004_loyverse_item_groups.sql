-- Groupes d'articles sauvegardés pour l'onglet Analyse (/loyverse).
-- Un groupe = une sélection d'items réutilisable ("Cartes postales" = 3 noms…),
-- partagée entre tous les accès au module (pas de propriétaire) : created_by
-- garde seulement la traçabilité. Le matching se fait sur item_name car
-- computeSalesAggregates met item_id à null pour les lignes non-mappées.

CREATE TABLE IF NOT EXISTS loyverse_item_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  item_names  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyverse_item_groups_name_unique UNIQUE (name),
  CONSTRAINT loyverse_item_groups_name_check CHECK (length(btrim(name)) > 0 AND length(name) <= 80)
);

CREATE INDEX IF NOT EXISTS loyverse_item_groups_name_idx ON loyverse_item_groups(name);

ALTER TABLE loyverse_item_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyverse_item_groups_owner_select" ON loyverse_item_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'owner'
    )
  );

CREATE POLICY "loyverse_item_groups_owner_insert" ON loyverse_item_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'owner'
    )
  );

CREATE POLICY "loyverse_item_groups_owner_update" ON loyverse_item_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'owner'
    )
  );

CREATE POLICY "loyverse_item_groups_owner_delete" ON loyverse_item_groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'owner'
    )
  );

COMMENT ON TABLE loyverse_item_groups IS 'Sélections d''articles sauvegardées pour l''onglet Analyse Loyverse (noms d''items, partagées, owner-only via RLS + routes API service-role).';
COMMENT ON COLUMN loyverse_item_groups.item_names IS 'Array de noms d''items Loyverse (net) ; le matching agrégé se fait sur le nom, item_id n''étant pas fiable pour les lignes non-mappées.';
