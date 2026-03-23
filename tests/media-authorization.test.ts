import { beforeEach, describe, expect, test, vi } from "vitest";

const postFindFirstMock = vi.fn();
const userFindFirstMock = vi.fn();
const getRelationshipDetailsMock = vi.fn();
const getVisibleUserIdsForViewerMock = vi.fn();
const isOwnedLocalUploadUrlMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findFirst: postFindFirstMock
    },
    user: {
      findFirst: userFindFirstMock
    }
  }
}));

vi.mock("@/lib/relationships", () => ({
  getRelationshipDetails: getRelationshipDetailsMock,
  getVisibleUserIdsForViewer: getVisibleUserIdsForViewerMock
}));

vi.mock("@/lib/storage", () => ({
  isOwnedLocalUploadUrl: isOwnedLocalUploadUrlMock
}));

describe("media authorization", () => {
  beforeEach(() => {
    postFindFirstMock.mockReset();
    userFindFirstMock.mockReset();
    getRelationshipDetailsMock.mockReset();
    getVisibleUserIdsForViewerMock.mockReset();
    isOwnedLocalUploadUrlMock.mockReset();
    postFindFirstMock.mockResolvedValue(null);
    userFindFirstMock.mockResolvedValue(null);
    getRelationshipDetailsMock.mockResolvedValue({ status: "none" });
    getVisibleUserIdsForViewerMock.mockResolvedValue([]);
    isOwnedLocalUploadUrlMock.mockReturnValue(false);
  });

  test("allows a signed-in user to access their own pending local upload", async () => {
    isOwnedLocalUploadUrlMock.mockReturnValue(true);

    const { resolveAuthorizedMediaTarget } = await import("@/lib/media-authorization");
    await expect(resolveAuthorizedMediaTarget("user_1", "/uploads/user_1/photo.png")).resolves.toEqual({
      kind: "relative",
      url: "/uploads/user_1/photo.png"
    });
    expect(postFindFirstMock).not.toHaveBeenCalled();
    expect(userFindFirstMock).not.toHaveBeenCalled();
  });

  test("blocks arbitrary relative upload paths that are not otherwise authorized", async () => {
    const { resolveAuthorizedMediaTarget } = await import("@/lib/media-authorization");
    await expect(resolveAuthorizedMediaTarget("user_1", "/uploads/user_2/photo.png")).resolves.toBeNull();
  });
});
