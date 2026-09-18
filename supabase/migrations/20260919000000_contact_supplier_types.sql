-- Contacts cleanup: supplier replaces provider, types become free-form.
-- Legacy rows keep their value (employee / provider / other keep working
-- as custom types), so nothing is lost.

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

UPDATE contacts SET contact_type = 'supplier' WHERE contact_type = 'provider';
