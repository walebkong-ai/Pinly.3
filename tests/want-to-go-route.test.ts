import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const findUniqueMock = vi.fn();
const createMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wantToGoPlace: {
      findUnique: findUniqueMock,
      create: createMock,
      deleteMany: deleteManyMock
    }
  }
}));

describe("want-to-go route", () => {
  const viewerId = "ck12345678901234567890123";
  const location = {
    placeName: "Mount Royal",
    city: "Montreal",
    country: "Canada",
    latitude: 45.5048,
    longitude: -73.5878
  };

  beforeEach(() => {
    authMock.mockReset();
    findUniqueMock.mockReset();
    createMock.mockReset();
    deleteManyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("GET returns an existing want-to-go place by key", async () => {
    findUniqueMock.mockResolvedValue({
      id: "ck99999999999999999999999",
      ...location
    });

    const { GET } = await import("@/app/api/want-to-go/route");
    const response = await GET(
      new Request("http://localhost/api/want-to-go?key=mount%20royal::montreal::canada::45.5048::-73.5878")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      item: {
        id: "ck99999999999999999999999",
        ...location
      }
    });
  });

  test("POST returns the existing place instead of duplicating it", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "ck99999999999999999999999",
      ...location
    });

    const { POST } = await import("@/app/api/want-to-go/route");
    const response = await POST(
      new Request("http://localhost/api/want-to-go", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(location)
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      saved: true,
      item: {
        id: "ck99999999999999999999999",
        ...location
      }
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  test("POST creates a new want-to-go place", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValue({
      id: "ck99999999999999999999999",
      ...location
    });

    const { POST } = await import("@/app/api/want-to-go/route");
    const response = await POST(
      new Request("http://localhost/api/want-to-go", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(location)
      })
    );

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: viewerId,
        placeKey: "mount royal::montreal::canada::45.5048::-73.5878",
        ...location
      },
      select: {
        id: true,
        placeName: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true
      }
    });
  });

  test("DELETE removes a want-to-go place", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    const { DELETE } = await import("@/app/api/want-to-go/route");
    const response = await DELETE(
      new Request("http://localhost/api/want-to-go", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: "ck99999999999999999999999" })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ saved: false });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "ck99999999999999999999999",
        userId: viewerId
      }
    });
  });
});
