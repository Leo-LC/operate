import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = ["20260811000000_finance_daily_pl_alpha.sql", "20260812085033_simplify_daily_profit_inputs.sql"]
  .map((file) => readFileSync(resolve(process.cwd(), "supabase/migrations", file), "utf8")).join("\n");
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

  it("uses Accounting only through read queries and excludes Payments from the simplified formula", () => {
    expect(server).toContain('.from("daily_entries").select(');
    expect(server).not.toContain('.from("employee_payment_records")');
  });
});
