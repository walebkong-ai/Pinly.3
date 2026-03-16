import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    postCollection: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      create: createMock
    }
  }
}));

describe("collections route", () => {
  const viewerId = "ck12345678901234567890123";

  beforeEach(() => {
    authMock.mockReset();
    findManyMock.mockReset();
    findFirstMock.mockReset();
    createMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("GET lists the viewer's collections", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "col_1",
        name: "Montreal trip",
        color: null,
        updatedAt: new Date("2026-03-15T12:00:00.000Z"),
        _count: { posts: 3 }
      }
    ]);

    const { GET } = await import("@/app/api/collections/route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      collections: [
        {
          id: "col_1",
          name: "Montreal trip",
          color: null,
          postCount: 3,
          updatedAt: new Date("2026-03-15T12:00:00.000Z").toISOString()
        }
      ]
    });
  });

  test("POST reuses an existing collection name instead of duplicating it", async () => {
    findFirstMock.mockResolvedValue({
      id: "col_1",
      name: "Montreal trip",
      color: null,
      updatedAt: new Date("2026-03-15T12:00:00.000Z"),
      _count: { posts: 3 }
    });

    const { POST } = await import("@/app/api/collections/route");
    const response = await POST(
      new Request("http://localhost/api/collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "montreal trip" })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      created: false,
      collection: {
        id: "col_1",
        name: "Montreal trip",
        color: null,
        postCount: 3,
        updatedAt: new Date("2026-03-15T12:00:00.000Z").toISOString()
      }
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  test("POST creates a new collection for the viewer", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: "col_2",
      name: "Summer 2026",
      color: null,
      updatedAt: new Date("2026-03-15T12:00:00.000Z")
    });

    const { POST } = await import("@/app/api/collections/route");
    const response = await POST(
      new Request("http://localhost/api/collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Summer 2026" })
      })
    );

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: viewerId,
        name: "Summer 2026",
        color: null
      },
      select: {
        id: true,
        name: true,
        color: true,
        updatedAt: true
      }
    });
  });
});
