import { describe, expect, it, afterEach } from "vitest";
import { getAccounts } from "./accounts";

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete (process.env as Record<string, unknown>)[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    // restore only keys we touched
    for (const k of Object.keys(env)) {
      if (prev[k] === undefined) delete (process.env as Record<string, unknown>)[k];
      else process.env[k] = prev[k];
    }
  }
}

describe("getAccounts", () => {
  afterEach(() => {
    delete process.env.LOYVERSE_ACCOUNTS;
    delete process.env.LOYVERSE_ACCESS_TOKEN;
  });

  it("parses LOYVERSE_ACCOUNTS JSON array", () => {
    withEnv(
      {
        LOYVERSE_ACCOUNTS: JSON.stringify([
          { key: "laguna", label: "Laguna", token: "tok1" },
          { key: "shop2", token: "tok2" },
        ]),
        LOYVERSE_ACCESS_TOKEN: undefined,
      },
      () => {
        const accs = getAccounts();
        expect(accs).toHaveLength(2);
        expect(accs[0]).toEqual({ key: "laguna", label: "Laguna", token: "tok1" });
        expect(accs[1].label).toBe("shop2");
      },
    );
  });

  it("falls back to legacy LOYVERSE_ACCESS_TOKEN", () => {
    withEnv({ LOYVERSE_ACCOUNTS: undefined, LOYVERSE_ACCESS_TOKEN: "legacy-tok" }, () => {
      const accs = getAccounts();
      expect(accs).toHaveLength(1);
      expect(accs[0].key).toBe("laguna");
      expect(accs[0].token).toBe("legacy-tok");
    });
  });

  it("prefers LOYVERSE_ACCOUNTS over legacy", () => {
    withEnv(
      {
        LOYVERSE_ACCOUNTS: JSON.stringify([{ key: "a", token: "tok-a" }]),
        LOYVERSE_ACCESS_TOKEN: "legacy-tok",
      },
      () => {
        const accs = getAccounts();
        expect(accs).toHaveLength(1);
        expect(accs[0].key).toBe("a");
      },
    );
  });

  it("returns empty array when nothing configured and ignores invalid JSON", () => {
    withEnv({ LOYVERSE_ACCOUNTS: "not-json", LOYVERSE_ACCESS_TOKEN: undefined }, () => {
      expect(getAccounts()).toEqual([]);
    });
    withEnv({ LOYVERSE_ACCOUNTS: JSON.stringify([{ key: "", token: "" }]), LOYVERSE_ACCESS_TOKEN: undefined }, () => {
      expect(getAccounts()).toEqual([]);
    });
    withEnv({ LOYVERSE_ACCOUNTS: undefined, LOYVERSE_ACCESS_TOKEN: undefined }, () => {
      expect(getAccounts()).toEqual([]);
    });
  });

  it("trims whitespace and skips entries missing key/token", () => {
    withEnv(
      {
        LOYVERSE_ACCOUNTS: JSON.stringify([
          { key: "  laguna  ", label: "  Laguna  ", token: "  tok1  " },
          { key: "bad", label: "Bad" },
          { token: "tok-only" },
        ]),
        LOYVERSE_ACCESS_TOKEN: undefined,
      },
      () => {
        const accs = getAccounts();
        expect(accs).toHaveLength(1);
        expect(accs[0].key).toBe("laguna");
        expect(accs[0].label).toBe("Laguna");
        expect(accs[0].token).toBe("tok1");
      },
    );
  });
});
