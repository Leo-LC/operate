import { describe, expect, it } from "vitest";
import {
  resolveShopCode,
  resolveShopName,
  shopCodeFromName,
  shopCodeFromSlug,
  shopDisplayName,
} from "@/lib/shops";

describe("shops registry", () => {
  it("resolves canonical names and slugs", () => {
    expect(shopCodeFromSlug("karon")).toBe("karon");
    expect(shopCodeFromSlug("chiang-mai")).toBe("chiang-mai");
    expect(shopCodeFromSlug("unknown")).toBeNull();
    expect(shopCodeFromName("Laguna")).toBe("laguna");
    expect(shopDisplayName("karon")).toBe("Karon");
  });

  it("resolves prefixed and aliased spellings", () => {
    expect(resolveShopCode("Capybara Coffee Ekkamai")).toBe("ekkamai");
    expect(resolveShopCode("BKK Silom")).toBe("silom");
    expect(resolveShopCode("Koh Phangan")).toBe("phangan");
    expect(resolveShopCode("CM")).toBe("chiang-mai");
    expect(resolveShopCode("Karon Beach")).toBe("karon");
    expect(resolveShopCode("Phuket Karon")).toBe("karon");
  });

  it("keeps bare Phuket as legacy Laguna", () => {
    expect(resolveShopCode("Phuket")).toBe("laguna");
    expect(resolveShopCode("Phuket Town")).toBe("laguna");
    expect(resolveShopCode("Phuket Laguna")).toBe("laguna");
    expect(resolveShopName("phuket")).toBe("Laguna");
  });

  it("returns null when nothing matches", () => {
    expect(resolveShopCode("")).toBeNull();
    expect(resolveShopCode("Bangkok")).toBeNull();
    expect(resolveShopCode("Olives Bar Tapas")).toBeNull();
    expect(resolveShopName("Nowhere")).toBeNull();
  });
});
