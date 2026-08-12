import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/20260812093328_finance_people_navigation.sql");
const recurringRoutes = `${read("src/app/api/finance/recurring-costs/route.ts")}\n${read("src/app/api/finance/recurring-costs/[id]/route.ts")}`;
const settingsRoute = read("src/app/api/finance/shop-settings/route.ts");

describe("Finance workspace contracts", () => {
  it("keeps schema changes additive and financial tables server-only", () => {
    expect(migration).not.toMatch(/DROP\s+(?:TABLE|COLUMN)|DELETE\s+FROM|TRUNCATE/i);
    expect(migration).toMatch(/ALTER TABLE finance_shop_settings ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/REVOKE ALL ON TABLE finance_shop_settings FROM anon, authenticated/i);
  });

  it("requires owner authorization and audit reasons for finance writes", () => {
    for (const source of [recurringRoutes, settingsRoute]) {
      expect(source).toContain("requireFinanceOwner");
      expect(source).toContain("finance_audit_events");
      expect(source).toMatch(/reason/);
    }
  });

  it("does not mutate protected operational modules", () => {
    const source = `${recurringRoutes}\n${settingsRoute}`;
    expect(source).not.toMatch(/from\("(?:daily_entries|employee_payment_records|payment_adjustments|treasury_[^"]+|attendance_records|schedules|locations)"\)\.(?:insert|upsert|update|delete)/);
  });
});
