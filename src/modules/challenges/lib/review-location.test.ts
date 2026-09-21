import { describe, expect, it } from "vitest";
import { buildGbpToUuidMap, reviewJoinKey } from "@/modules/challenges/lib/review-location";

const KARON_UUID = "7a738393-a5be-4e96-a02f-bbddfa27d68a";
const SILOM_UUID = "75547ab0-8846-427b-a530-5ea3f2803dfc";

const gbpToUuid = buildGbpToUuidMap([
  { id: SILOM_UUID, external_id: "locations/2465044010509373862" },
  { id: KARON_UUID, external_id: null },
]);

describe("review-location join keys", () => {
  it("builds GBP text → UUID map from locations", () => {
    expect(gbpToUuid.get("locations/2465044010509373862")).toBe(SILOM_UUID);
    expect(gbpToUuid.has("locations/17423194230027303735")).toBe(false);
  });

  it("prefers the stored location_uuid", () => {
    expect(
      reviewJoinKey(
        { location_id: "locations/2465044010509373862", location_uuid: SILOM_UUID },
        gbpToUuid,
      ),
    ).toBe(SILOM_UUID);
  });

  it("resolves legacy TEXT rows via the GBP map", () => {
    expect(
      reviewJoinKey({ location_id: "locations/2465044010509373862", location_uuid: null }, gbpToUuid),
    ).toBe(SILOM_UUID);
  });

  it("keeps the TEXT id for reviews-only locations with no locations row", () => {
    expect(
      reviewJoinKey({ location_id: "locations/17423194230027303735", location_uuid: null }, gbpToUuid),
    ).toBe("locations/17423194230027303735");
  });
});
