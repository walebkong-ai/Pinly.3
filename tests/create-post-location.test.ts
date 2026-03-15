import { describe, expect, test } from "vitest";

import {
  buildLocationDisplayName,
  getGeolocationErrorMessage,
  getReverseLookupErrorMessage,
  hasFiniteCoordinates,
  parseCoordinateInput
} from "@/lib/create-post-location";

describe("create-post location helpers", () => {
  test("builds a readable place label", () => {
    expect(
      buildLocationDisplayName({
        placeName: "Old Port",
        city: "Montreal",
        country: "Canada"
      })
    ).toBe("Old Port, Montreal, Canada");
  });

  test("recognizes finite coordinates only", () => {
    expect(hasFiniteCoordinates(45.5, -73.5)).toBe(true);
    expect(hasFiniteCoordinates(null, -73.5)).toBe(false);
    expect(hasFiniteCoordinates(Number.NaN, -73.5)).toBe(false);
  });

  test("parses coordinate text safely", () => {
    expect(parseCoordinateInput("45.5048")).toBe(45.5048);
    expect(parseCoordinateInput("")).toBeNull();
    expect(parseCoordinateInput("not-a-number")).toBeNull();
  });

  test("returns mobile-friendly geolocation error messages", () => {
    expect(
      getGeolocationErrorMessage({
        supported: true,
        secureContext: false
      })
    ).toMatch(/secure HTTPS/i);

    expect(
      getGeolocationErrorMessage({
        supported: false,
        secureContext: true
      })
    ).toMatch(/does not support current location/i);

    expect(
      getGeolocationErrorMessage({
        supported: true,
        secureContext: true,
        code: 1
      })
    ).toMatch(/denied/i);
  });

  test("maps reverse lookup failures to actionable guidance", () => {
    expect(getReverseLookupErrorMessage("REVERSE_SEARCH_TIMEOUT")).toMatch(/took too long/i);
    expect(getReverseLookupErrorMessage("REVERSE_SEARCH_FETCH_FAILED")).toMatch(/could not name the place/i);
    expect(getReverseLookupErrorMessage()).toMatch(/could not confirm the place details/i);
  });
});
