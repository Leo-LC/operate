-- Employee document categories become free-form (same approach as contacts
-- in 20260919000000: drop the CHECK, legacy rows keep their value).
-- Builtins (id_card, passport, work_permit, contract) stay the defaults in
-- app code; staff-added custom slugs are then reusable by all employees.
-- Legacy 'other' rows keep working and display as "Other".

ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_doc_type_check;
