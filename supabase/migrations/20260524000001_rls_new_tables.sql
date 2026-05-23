-- Enable RLS on new tables (app uses service role which bypasses RLS;
-- this blocks direct anon/user JWT access to payroll and HR data)
ALTER TABLE hr_settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payment_records ENABLE ROW LEVEL SECURITY;
