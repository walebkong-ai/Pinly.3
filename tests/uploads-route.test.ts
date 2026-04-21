import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const assertStorageConfigurationMock = vi.fn();
const getMaxUploadSizeBytesMock = vi.fn();
const inferMediaTypeMock = vi.fn();
const saveUploadedFileMock = vi.fn();
const normalizeStoredMediaUrlMock = vi.fn();
const enforceRateLimitMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/storage", () => ({
  StorageConfigError: class StorageConfigError extends Error {},
  assertStorageConfiguration: assertStorageConfigurationMock,
  getMaxUploadSizeBytes: getMaxUploadSizeBytesMock,
  inferMediaType: inferMediaTypeMock,
  saveUploadedFile: saveUploadedFileMock
}));

vi.mock("@/lib/media-url", () => ({
  normalizeStoredMediaUrl: normalizeStoredMediaUrlMock
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock
}));

describe("uploads route", () => {
  beforeEach(() => {
    authMock.mockReset();
    assertStorageConfigurationMock.mockReset();
    getMaxUploadSizeBytesMock.mockReset();
    inferMediaTypeMock.mockReset();
    saveUploadedFileMock.mockReset();
    normalizeStoredMediaUrlMock.mockReset();
    enforceRateLimitMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
    assertStorageConfigurationMock.mockReturnValue(undefined);
    getMaxUploadSizeBytesMock.mockReturnValue(4 * 1024 * 1024);
    enforceRateLimitMock.mockResolvedValue(null);
    inferMediaTypeMock.mockReturnValue("IMAGE");
    saveUploadedFileMock.mockResolvedValue("https://demo.supabase.co/storage/v1/object/public/media/viewer_1/photo.png");
    normalizeStoredMediaUrlMock.mockReturnValue("https://demo.supabase.co/storage/v1/object/public/media/viewer_1/photo.png");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("rejects unauthenticated uploads", async () => {
    authMock.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("file", new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" }));

    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: formData
      }) as any
    );

    expect(response.status).toBe(401);
    expect(saveUploadedFileMock).not.toHaveBeenCalled();
  });

  test("rejects invalid upload types", async () => {
    inferMediaTypeMock.mockImplementation(() => {
      throw new Error("Unsupported file type");
    });

    const formData = new FormData();
    formData.set("file", new File([new Uint8Array([1, 2, 3])], "script.svg", { type: "image/svg+xml" }));

    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: formData
      }) as any
    );

    expect(response.status).toBe(415);
    expect(saveUploadedFileMock).not.toHaveBeenCalled();
  });
});
