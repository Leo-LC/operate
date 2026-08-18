import { describe, expect, it } from "vitest";
import { lastVaccinationDate, suggestNextVaccine } from "./vaccines";

describe("vaccine helpers", () => {
  it("returns the most recent date", () => {
    expect(lastVaccinationDate(["2024-01-01", "2023-06-01", "2024-06-01"])).toBe("2024-06-01");
    expect(lastVaccinationDate([])).toBeNull();
    expect(lastVaccinationDate(["2024-01-01", ""])).toBe("2024-01-01");
  });

  it("suggests +1 month for a single vaccine", () => {
    expect(suggestNextVaccine(["2024-01-31"])).toBe("2024-02-29");
    expect(suggestNextVaccine(["2025-01-31"])).toBe("2025-02-28");
  });

  it("suggests +1 year when there are multiple vaccines", () => {
    expect(suggestNextVaccine(["2023-06-01", "2024-06-01"])).toBe("2025-06-01");
    expect(suggestNextVaccine(["2024-02-29", "2025-02-28"])).toBe("2026-02-28");
  });

  it("returns null with no vaccine dates", () => {
    expect(suggestNextVaccine([])).toBeNull();
  });
});