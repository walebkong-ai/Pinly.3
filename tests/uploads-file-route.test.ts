import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const resolveAuthorizedMediaTargetMock = vi.fn();
const resolveLocalUploadPathMock = vi.fn();
const getLocalUploadContentTypeMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/media-authorization", () => ({
  resolveAuthorizedMediaTarget: resolveAuthorizedMediaTargetMock
}));

vi.mock("@/lib/storage", () => ({
  resolveLocalUploadPath: resolveLocalUploadPathMock,
  getLocalUploadContentType: getLocalUploadContentTypeMock
}));

describe("uploads file route", () => {
  let tempFile: string;

  beforeEach(async () => {
    authMock.mockReset();
    resolveAuthorizedMediaTargetMock.mockReset();
    resolveLocalUploadPathMock.mockReset();
    getLocalUploadContentTypeMock.mockReset();
    authMock.mockResolvedValue({
      user: {
        id: "user_1"
      }
    });
    tempFile = path.join(os.tmpdir(), `pinly-upload-${Date.now()}.png`);
    await fs.writeFile(tempFile, Buffer.from([1, 2, 3]));
    getLocalUploadContentTypeMock.mockReturnValue("image/png");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await fs.unlink(tempFile);
    } catch {}
  });

  test("streams authorized local uploads", async () => {
    resolveAuthorizedMediaTargetMock.mockResolvedValue({
      kind: "relative",
      url: "/uploads/user_1/photo.png"
    });
    resolveLocalUploadPathMock.mockReturnValue(tempFile);

    const { GET } = await import("@/app/uploads/[...path]/route");
    const response = await GET(new Request("http://localhost/uploads/user_1/photo.png"), {
      params: Promise.resolve({ path: ["user_1", "photo.png"] })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from([1, 2, 3]));
  });

  test("rejects unauthenticated upload requests", async () => {
    authMock.mockResolvedValue(null);

    const { GET } = await import("@/app/uploads/[...path]/route");
    const response = await GET(new Request("http://localhost/uploads/user_1/photo.png"), {
      params: Promise.resolve({ path: ["user_1", "photo.png"] })
    });

    expect(response.status).toBe(401);
  });

  test("returns not found when the upload path is not authorized", async () => {
    resolveAuthorizedMediaTargetMock.mockResolvedValue(null);

    const { GET } = await import("@/app/uploads/[...path]/route");
    const response = await GET(new Request("http://localhost/uploads/user_2/photo.png"), {
      params: Promise.resolve({ path: ["user_2", "photo.png"] })
    });

    expect(response.status).toBe(404);
  });
});
