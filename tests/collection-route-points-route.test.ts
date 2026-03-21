import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisibleCollectionRoutePointsMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisibleCollectionRoutePoints: getVisibleCollectionRoutePointsMock
}));

describe("collection route points route", () => {
  beforeEach(() => {
    authMock.mockReset();
    getVisibleCollectionRoutePointsMock.mockReset();
  });

  test("requires authentication before returning route points", async () => {
    authMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/collections/[collectionId]/route-points/route");
    const response = await GET(new Request("http://localhost/api/collections/col_1/route-points"), {
      params: Promise.resolve({ collectionId: "col_1" })
    });

    expect(response.status).toBe(401);
  });

  test("returns only the route points visible to the current viewer", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
    getVisibleCollectionRoutePointsMock.mockResolvedValue([
      {
        postId: "post_1",
        latitude: 45.5,
        longitude: -73.55,
        visitedAt: new Date("2026-03-15T12:00:00.000Z")
      }
    ]);

    const { GET } = await import("@/app/api/collections/[collectionId]/route-points/route");
    const response = await GET(new Request("http://localhost/api/collections/col_1/route-points"), {
      params: Promise.resolve({ collectionId: "col_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      points: [
        {
          postId: "post_1",
          latitude: 45.5,
          longitude: -73.55,
          visitedAt: new Date("2026-03-15T12:00:00.000Z").toISOString()
        }
      ]
    });
    expect(getVisibleCollectionRoutePointsMock).toHaveBeenCalledWith("viewer_1", "col_1");
  });
});
