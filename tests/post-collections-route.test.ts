import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const postFindUniqueMock = vi.fn();
const collectionFindManyMock = vi.fn();
const collectionUpdateManyMock = vi.fn();
const collectionItemFindManyMock = vi.fn();
const collectionItemDeleteManyMock = vi.fn();
const collectionItemCreateManyMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: postFindUniqueMock
    },
    postCollection: {
      findMany: collectionFindManyMock,
      updateMany: collectionUpdateManyMock
    },
    postCollectionItem: {
      findMany: collectionItemFindManyMock,
      deleteMany: collectionItemDeleteManyMock,
      createMany: collectionItemCreateManyMock
    },
    $transaction: transactionMock
  }
}));

describe("post collections route", () => {
  const viewerId = "ck12345678901234567890123";
  const postId = "ckpost1234567890123456789";
  const collectionIdOne = "ck11111111111111111111111";
  const collectionIdTwo = "ck22222222222222222222222";
  const collectionIdThree = "ck33333333333333333333333";

  beforeEach(() => {
    authMock.mockReset();
    postFindUniqueMock.mockReset();
    collectionFindManyMock.mockReset();
    collectionUpdateManyMock.mockReset();
    collectionItemFindManyMock.mockReset();
    collectionItemDeleteManyMock.mockReset();
    collectionItemCreateManyMock.mockReset();
    transactionMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
    transactionMock.mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations));
  });

  test("PUT syncs the selected collections for an owned post", async () => {
    postFindUniqueMock.mockResolvedValue({ userId: viewerId });
    collectionFindManyMock.mockResolvedValue([
      { id: collectionIdOne, name: "Montreal trip" },
      { id: collectionIdTwo, name: "Summer 2026" }
    ]);
    collectionItemFindManyMock.mockResolvedValue([{ collectionId: collectionIdThree }]);
    collectionItemDeleteManyMock.mockResolvedValue({ count: 1 });
    collectionItemCreateManyMock.mockResolvedValue({ count: 2 });
    collectionUpdateManyMock.mockResolvedValue({ count: 3 });

    const { PUT } = await import("@/app/api/posts/[postId]/collections/route");
    const response = await PUT(
      new Request(`http://localhost/api/posts/${postId}/collections`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collectionIds: [collectionIdOne, collectionIdTwo] })
      }),
      {
        params: Promise.resolve({ postId })
      }
    );

    expect(response.status).toBe(200);
    expect(collectionItemDeleteManyMock).toHaveBeenCalledWith({
      where: {
        postId,
        collectionId: { in: [collectionIdThree] }
      }
    });
    expect(collectionItemCreateManyMock).toHaveBeenCalledWith({
      data: [
        { postId, collectionId: collectionIdOne },
        { postId, collectionId: collectionIdTwo }
      ],
      skipDuplicates: true
    });
    expect(collectionUpdateManyMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      collections: [
        { id: collectionIdOne, name: "Montreal trip" },
        { id: collectionIdTwo, name: "Summer 2026" }
      ]
    });
  });

  test("PUT rejects posts the viewer does not own", async () => {
    postFindUniqueMock.mockResolvedValue({ userId: "someone-else" });

    const { PUT } = await import("@/app/api/posts/[postId]/collections/route");
    const response = await PUT(
      new Request(`http://localhost/api/posts/${postId}/collections`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collectionIds: [collectionIdOne] })
      }),
      {
        params: Promise.resolve({ postId })
      }
    );

    expect(response.status).toBe(403);
    expect(collectionFindManyMock).not.toHaveBeenCalled();
  });

  test("PUT rejects collections that do not belong to the viewer", async () => {
    postFindUniqueMock.mockResolvedValue({ userId: viewerId });
    collectionFindManyMock.mockResolvedValue([{ id: collectionIdOne, name: "Montreal trip" }]);

    const { PUT } = await import("@/app/api/posts/[postId]/collections/route");
    const response = await PUT(
      new Request(`http://localhost/api/posts/${postId}/collections`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collectionIds: [collectionIdOne, collectionIdTwo] })
      }),
      {
        params: Promise.resolve({ postId })
      }
    );

    expect(response.status).toBe(403);
    expect(collectionItemFindManyMock).not.toHaveBeenCalled();
  });
});
