import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260811000000_finance_daily_pl_alpha.sql"), "utf8");
const server = readFileSync(resolve(process.cwd(), "src/modules/reports/daily-profit/server.ts"), "utf8");
const configRoute = readFileSync(resolve(process.cwd(), "src/app/api/reports/daily-profit/config/route.ts"), "utf8");
const syncRoute = readFileSync(resolve(process.cwd(), "src/app/api/reports/daily-profit/sync/route.ts"), "utf8");

describe("Daily P&L isolation contract", () => {
  it("never alters source module tables in its migration", () => {
    for (const table of ["daily_entries", "monthly_fixed_expenses", "employee_payment_records", "payment_adjustments", "employees", "locations", "treasury_bank_accounts"]) {
      expect(migration).not.toMatch(new RegExp(`ALTER\\s+TABLE\\s+${table}`, "i"));
      expect(migration).not.toMatch(new RegExp(`UPDATE\\s+${table}`, "i"));
      expect(migration).not.toMatch(new RegExp(`DELETE\\s+FROM\\s+${table}`, "i"));
    }
  });

  it("keeps every Daily P&L mutation on finance-prefixed tables", () => {
    const mutationSources = `${configRoute}\n${syncRoute}`;
    expect(mutationSources).not.toMatch(/from\("(?:daily_entries|monthly_fixed_expenses|employee_payment_records|payment_adjustments|employees|locations|treasury_[^"]+)"\)\.(?:insert|upsert|update|delete)/);
  });

  it("uses Accounting and Payments only through read queries", () => {
    expect(server).toContain('.from("daily_entries").select(');
    expect(server).toContain('.from("employee_payment_records").select(');
  });
});
