-- Simplify note kinds: idea/todo -> suggestion, warning -> alerte.
-- Drop the old CHECK first, otherwise the UPDATE itself violates it.
ALTER TABLE page_notes DROP CONSTRAINT IF EXISTS page_notes_kind_check;

UPDATE page_notes SET kind = 'suggestion' WHERE kind IN ('idea', 'todo');
UPDATE page_notes SET kind = 'alerte' WHERE kind = 'warning';

ALTER TABLE page_notes ADD CONSTRAINT page_notes_kind_check CHECK (kind IN ('suggestion', 'alerte'));
