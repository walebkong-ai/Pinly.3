import { describe, expect, test } from "vitest";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  getDirectionsProviderOrder,
  hasValidDirectionsCoordinates,
  isLikelyIOSDevice
} from "@/lib/directions";

const postLocation = {
  placeName: "Shibuya Crossing",
  city: "Tokyo",
  country: "Japan",
  latitude: 35.6595,
  longitude: 139.7005
};

describe("directions helpers", () => {
  test("recognizes valid coordinates", () => {
    expect(hasValidDirectionsCoordinates(postLocation)).toBe(true);
    expect(hasValidDirectionsCoordinates({ ...postLocation, latitude: Number.NaN })).toBe(false);
    expect(hasValidDirectionsCoordinates({ ...postLocation, longitude: null })).toBe(false);
  });

  test("builds an Apple Maps directions link with destination coordinates", () => {
    const url = new URL(buildAppleMapsDirectionsUrl(postLocation) ?? "");

    expect(url.origin).toBe("https://maps.apple.com");
    expect(url.searchParams.get("daddr")).toBe("35.6595,139.7005");
    expect(url.searchParams.get("q")).toBe("Shibuya Crossing, Tokyo, Japan");
  });

  test("builds a Google Maps directions link with destination coordinates", () => {
    const url = new URL(buildGoogleMapsDirectionsUrl(postLocation) ?? "");

    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe("35.6595,139.7005");
  });

  test("orders Apple Maps first on iPhone-like devices", () => {
    expect(
      getDirectionsProviderOrder({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone"
      })
    ).toEqual(["apple", "google"]);
  });

  test("detects iPadOS Safari in desktop mode", () => {
    expect(
      isLikelyIOSDevice({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
        platform: "MacIntel",
        maxTouchPoints: 5
      })
    ).toBe(true);
  });
});
