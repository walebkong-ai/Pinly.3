import { afterEach, describe, expect, test, vi } from "vitest";
import { GET } from "@/app/api/places/search/route";

describe("place search route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("normalizes place search results", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            place_id: 1,
            lat: "48.8566",
            lon: "2.3522",
            display_name: "Paris, Ile-de-France, France",
            name: "Paris",
            address: {
              city: "Paris",
              country: "France"
            }
          }
        ]),
        { status: 200 }
      )
    );

    const response = await GET(new Request("http://localhost/api/places/search?q=paris"));
    const data = await response.json();

    expect(data.places).toEqual([
      {
        id: "1",
        placeName: "Paris",
        displayName: "Paris, Ile-de-France, France",
        city: "Paris",
        country: "France",
        latitude: 48.8566,
        longitude: 2.3522
      }
    ]);
  });
});
