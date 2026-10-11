import { describe, expect, it } from "vitest";
import { getAccountsAsync, maskToken, clearAccountsCache } from "./accounts-server";

describe("accounts-server", () => {
  it("masks tokens without exposing them", () => {
    expect(maskToken("abcdefghij1234")).toBe("••••••1234");
    expect(maskToken("short")).toBe("••••••••");
  });

  it("falls back to env when DB is unreachable", async () => {
    clearAccountsCache();
    process.env.LOYVERSE_ACCOUNTS = JSON.stringify([{ key: "fallback-shop", token: "tok-fallback" }]);
    // No SUPABASE_* in test env → loadDbAccounts throws → env fallback.
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const accs = await getAccountsAsync({ noCache: true });
      expect(accs.map((a) => a.key)).toContain("fallback-shop");
    } finally {
      delete process.env.LOYVERSE_ACCOUNTS;
      clearAccountsCache();
    }
  });
});
