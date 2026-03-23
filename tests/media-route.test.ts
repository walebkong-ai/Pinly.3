import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const resolveAuthorizedMediaTargetMock = vi.fn();
const assertStorageConfigurationMock = vi.fn();
const getBlobAccessModeMock = vi.fn();
const getStorageDriverMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/media-authorization", () => ({
  resolveAuthorizedMediaTarget: resolveAuthorizedMediaTargetMock
}));

vi.mock("@/lib/storage", () => ({
  assertStorageConfiguration: assertStorageConfigurationMock,
  getBlobAccessMode: getBlobAccessModeMock,
  getStorageDriver: getStorageDriverMock
}));

describe("media route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    authMock.mockReset();
    resolveAuthorizedMediaTargetMock.mockReset();
    assertStorageConfigurationMock.mockReset();
    getBlobAccessModeMock.mockReset();
    getStorageDriverMock.mockReset();
    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
    getStorageDriverMock.mockReturnValue("vercel-blob");
    getBlobAccessModeMock.mockReturnValue("private");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response("image-bytes", {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "private, max-age=60"
        }
      })
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("rejects unauthenticated media requests", async () => {
    authMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request("http://localhost/api/media?url=https://public.blob.vercel-storage.com/file.jpg"));

    expect(response.status).toBe(401);
  });

  test("redirects approved local uploads without proxying arbitrary paths", async () => {
    resolveAuthorizedMediaTargetMock.mockResolvedValue({
      kind: "relative",
      url: "/uploads/example.jpg"
    });

    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request("http://localhost/api/media?url=/uploads/example.jpg"));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost/uploads/example.jpg");
  });

  test("proxies approved blob media with the blob token only after authorization", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token";
    resolveAuthorizedMediaTargetMock.mockResolvedValue({
      kind: "remote",
      url: "https://public.blob.vercel-storage.com/file.jpg"
    });

    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request("http://localhost/api/media?url=https://public.blob.vercel-storage.com/file.jpg"));

    expect(response.status).toBe(200);
    expect(assertStorageConfigurationMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://public.blob.vercel-storage.com/file.jpg",
      expect.objectContaining({
        headers: expect.any(Headers),
        cache: "no-store"
      })
    );
    const fetchHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(fetchHeaders.get("authorization")).toBe("Bearer token");
  });

  test("returns not found when the viewer is not authorized for the requested media", async () => {
    resolveAuthorizedMediaTargetMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request("http://localhost/api/media?url=https://public.blob.vercel-storage.com/file.jpg"));

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("adds a private cache policy when the upstream media does not provide one", async () => {
    fetchMock.mockResolvedValue(
      new Response("image-bytes", {
        status: 200,
        headers: {
          "content-type": "image/jpeg"
        }
      })
    );
    resolveAuthorizedMediaTargetMock.mockResolvedValue({
      kind: "remote",
      url: "https://public.blob.vercel-storage.com/file.jpg"
    });

    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request("http://localhost/api/media?url=https://public.blob.vercel-storage.com/file.jpg"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=300, stale-while-revalidate=86400");
    expect(response.headers.get("vary")).toBe("Cookie, Range");
  });
});
