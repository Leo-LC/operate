-- Thai bank details for payroll transfer.
-- When has_thai_bank_account = true, domestic transfer requires bank name,
-- account number and account holder name (full name as on bank book).
-- For Thailand domestic transfers: bank name + 10-digit (or 5-16) account number
-- + holder name is sufficient; SWIFT not needed. PromptPay (phone/ID) could be
-- added later if needed.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
