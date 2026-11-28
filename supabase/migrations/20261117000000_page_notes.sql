-- Page notes: lightweight working notes ("idea" / "todo" / "warning") attached to
-- any dashboard page. Owner + admin only, shared between authors.
-- Powers the floating corner widget in DashboardShell.
CREATE TABLE IF NOT EXISTS page_notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  path         TEXT        NOT NULL,               -- dashboard route, e.g. "/accounting"
  module_key   TEXT,                               -- first path segment, for light grouping
  kind         TEXT        NOT NULL DEFAULT 'idea' CHECK (kind IN ('idea', 'todo', 'warning')),
  body         TEXT        NOT NULL,
  author_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  author_email TEXT        NOT NULL,
  author_name  TEXT,
  anchor       TEXT,                               -- reserved: element pinning (future)
  resolved     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_notes_path_idx ON page_notes(path);
CREATE INDEX IF NOT EXISTS page_notes_active_idx ON page_notes(resolved, created_at DESC);

ALTER TABLE page_notes ENABLE ROW LEVEL SECURITY;
