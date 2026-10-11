import { describe, expect, it } from "vitest";
import { inferLocationFromAccount } from "./store-mapping";

function byAccount(entries: Array<[string, string[]]>): Map<string, Set<string>> {
  return new Map(entries.map(([k, v]) => [k, new Set(v)] as [string, Set<string>]));
}

describe("inferLocationFromAccount", () => {
  it("inherits the single location of the same account (POS swap = same shop)", () => {
    expect(inferLocationFromAccount("pattaya", byAccount([["pattaya", ["loc-pattaya"]]]))).toBe("loc-pattaya");
  });

  it("stays null when the account spans several locations (ambiguous)", () => {
    expect(
      inferLocationFromAccount("shared", byAccount([["shared", ["loc-a", "loc-b"]]])),
    ).toBeNull();
  });

  it("stays null for unknown or missing account", () => {
    const m = byAccount([["pattaya", ["loc-pattaya"]]]);
    expect(inferLocationFromAccount("unknown", m)).toBeNull();
    expect(inferLocationFromAccount(null, m)).toBeNull();
    expect(inferLocationFromAccount(undefined, m)).toBeNull();
  });
});
