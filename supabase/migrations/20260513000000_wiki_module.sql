-- Wiki categories
CREATE TABLE wiki_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  name        text NOT NULL,
  slug        text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Wiki pages
CREATE TABLE wiki_pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id),
  title         text NOT NULL,
  slug          text NOT NULL,
  content       text,
  content_type  text NOT NULL CHECK (content_type IN ('html', 'richtext')),
  category_id   uuid REFERENCES wiki_categories(id),
  created_by    text NOT NULL,
  updated_by    text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Wiki role grants (viewer | editor per user, overrides default)
CREATE TABLE wiki_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  user_email  text NOT NULL,
  role        text NOT NULL CHECK (role IN ('viewer', 'editor')),
  UNIQUE (org_id, user_email)
);

-- RLS
ALTER TABLE wiki_pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_roles       ENABLE ROW LEVEL SECURITY;

-- Org-isolation + role policies
-- API routes call set_config('app.org_id', ...) and set_config('app.wiki_role', ...) before each query
CREATE POLICY wiki_pages_select ON wiki_pages FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY wiki_pages_insert ON wiki_pages FOR INSERT
  WITH CHECK (
    org_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.wiki_role', true) = 'editor'
  );

CREATE POLICY wiki_pages_update ON wiki_pages FOR UPDATE
  USING (
    org_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.wiki_role', true) = 'editor'
  );

CREATE POLICY wiki_pages_delete ON wiki_pages FOR DELETE
  USING (
    org_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.wiki_role', true) = 'editor'
  );

CREATE POLICY wiki_categories_select ON wiki_categories FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY wiki_categories_insert ON wiki_categories FOR INSERT
  WITH CHECK (
    org_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.wiki_role', true) = 'editor'
  );

CREATE POLICY wiki_categories_update ON wiki_categories FOR UPDATE
  USING (
    org_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.wiki_role', true) = 'editor'
  );

CREATE POLICY wiki_categories_delete ON wiki_categories FOR DELETE
  USING (
    org_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.wiki_role', true) = 'editor'
  );

CREATE POLICY wiki_roles_select ON wiki_roles FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY wiki_roles_all ON wiki_roles FOR ALL
  USING (
    org_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.wiki_role', true) = 'editor'
  );
