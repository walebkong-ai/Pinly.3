import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const wantToGoFindManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wantToGoPlace: {
      findMany: wantToGoFindManyMock
    }
  }
}));

describe("place search route", () => {
  beforeEach(() => {
    authMock.mockReset();
    wantToGoFindManyMock.mockReset();

    authMock.mockResolvedValue(null);
    wantToGoFindManyMock.mockResolvedValue([]);
  });

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

    const { GET } = await import("@/app/api/places/search/route");
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

  test("returns local want-to-go places if upstream search fails", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
    wantToGoFindManyMock.mockResolvedValue([
      {
        id: "place_1",
        placeName: "Tokyo Tower",
        city: "Tokyo",
        country: "Japan",
        latitude: 35.6586,
        longitude: 139.7454,
        updatedAt: new Date("2026-03-15T00:00:00.000Z")
      }
    ]);
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));

    const { GET } = await import("@/app/api/places/search/route");
    const response = await GET(new Request("http://localhost/api/places/search?q=tokyo"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.places).toEqual([
      {
        id: "want-to-go:place_1",
        placeName: "Tokyo Tower",
        displayName: "Tokyo Tower, Tokyo, Japan",
        city: "Tokyo",
        country: "Japan",
        latitude: 35.6586,
        longitude: 139.7454
      }
    ]);
  });
});
