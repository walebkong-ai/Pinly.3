import { afterEach, describe, expect, test, vi } from "vitest";

describe("place reverse route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("falls back to broader address fields when city is missing", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          display_name: "Shibuya Sky, Shibuya City, Tokyo, Japan",
          name: "Shibuya Sky",
          address: {
            suburb: "Shibuya City",
            state: "Tokyo",
            country: "Japan"
          }
        }),
        { status: 200 }
      )
    );

    const { GET } = await import("@/app/api/places/reverse/route");
    const response = await GET(new Request("http://localhost/api/places/reverse?lat=35.6580&lon=139.7016"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.place).toEqual({
      placeName: "Shibuya Sky",
      city: "Shibuya City",
      country: "Japan"
    });
  });

  test("uses country code when country name is unavailable", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          display_name: "North Shore, Auckland, nz",
          name: "North Shore",
          address: {
            state: "Auckland",
            country_code: "nz"
          }
        }),
        { status: 200 }
      )
    );

    const { GET } = await import("@/app/api/places/reverse/route");
    const response = await GET(new Request("http://localhost/api/places/reverse?lat=-36.8&lon=174.7"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.place).toEqual({
      placeName: "North Shore",
      city: "Auckland",
      country: "New Zealand"
    });
  });
});
