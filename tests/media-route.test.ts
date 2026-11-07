import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TEST_IMAGE_URL } from "@/tests/fixtures/media";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const getVisibleUserIdsMock = vi.fn();
const postFindFirstMock = vi.fn();
const userFindFirstMock = vi.fn();
const createSignedSupabaseObjectUrlMock = vi.fn();
const enforceRateLimitMock = vi.fn();
const convertHeicToJpegMock = vi.fn();
const readHeicResponseMock = vi.fn();

const LEGACY_HEIC_URL = "https://2artlyjzrtu4ozob.public.blob.vercel-storage.com/uploads/photo.heic";

vi.mock("@/lib/server-heic", () => ({
  convertHeicToJpeg: convertHeicToJpegMock,
  readHeicResponse: readHeicResponseMock
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisiblePostById: getVisiblePostByIdMock,
  getVisibleUserIds: getVisibleUserIdsMock
}));

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

vi.mock("@/lib/supabase-storage", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/supabase-storage")>(),
  createSignedSupabaseObjectUrl: createSignedSupabaseObjectUrlMock
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock
}));

describe("media route", () => {
  beforeEach(() => {
    authMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    getVisibleUserIdsMock.mockReset();
    postFindFirstMock.mockReset();
    userFindFirstMock.mockReset();
    createSignedSupabaseObjectUrlMock.mockReset();
    enforceRateLimitMock.mockReset();
    convertHeicToJpegMock.mockReset();
    readHeicResponseMock.mockReset();
    readHeicResponseMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    convertHeicToJpegMock.mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));

    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
    enforceRateLimitMock.mockResolvedValue(null);
    createSignedSupabaseObjectUrlMock.mockResolvedValue("https://signed.example.com/object");
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "image/png"
        }
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("requires authentication", async () => {
    authMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request(`http://localhost/api/media?src=${encodeURIComponent(TEST_IMAGE_URL)}`));

    expect(response.status).toBe(401);
  });

  test("rejects requests for media the viewer cannot access", async () => {
    postFindFirstMock.mockResolvedValue({
      id: "post_1"
    });
    getVisiblePostByIdMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request(`http://localhost/api/media?src=${encodeURIComponent(TEST_IMAGE_URL)}`));

    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  test("converts an accessible legacy HEIC to JPEG without changing the post", async () => {
    postFindFirstMock.mockResolvedValue({ id: "post_1" });
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1" });
    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request(`http://localhost/api/media?src=${encodeURIComponent(LEGACY_HEIC_URL)}`, {
      headers: { Range: "bytes=0-1" }
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("content-range")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("private");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
    expect(fetch).toHaveBeenCalledWith(LEGACY_HEIC_URL, expect.objectContaining({ redirect: "error", headers: undefined }));
    expect(createSignedSupabaseObjectUrlMock).not.toHaveBeenCalled();
    expect(getVisiblePostByIdMock).toHaveBeenCalledWith("viewer_1", "post_1");
  });

  test("denies inaccessible legacy HEIC files before fetching or converting", async () => {
    postFindFirstMock.mockResolvedValue({ id: "private_post" });
    getVisiblePostByIdMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request(`http://localhost/api/media?src=${encodeURIComponent(LEGACY_HEIC_URL)}`));
    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    expect(convertHeicToJpegMock).not.toHaveBeenCalled();
  });

  test("does not turn arbitrary image URLs into a server-side fetch proxy", async () => {
    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request("http://localhost/api/media?src=https://evil.example/photo.heic"));
    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  test("converts a Supabase HEIF using its signed URL", async () => {
    postFindFirstMock.mockResolvedValue({ id: "post_1" });
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1" });
    const source = TEST_IMAGE_URL.replace(/jpg$/, "heif");
    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request(`http://localhost/api/media?src=${encodeURIComponent(source)}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(createSignedSupabaseObjectUrlMock).toHaveBeenCalledWith(source);
  });

  test("continues streaming ordinary photos without conversion", async () => {
    postFindFirstMock.mockResolvedValue({ id: "post_1" });
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1" });
    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request(`http://localhost/api/media?src=${encodeURIComponent(TEST_IMAGE_URL)}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(convertHeicToJpegMock).not.toHaveBeenCalled();
  });

  test("returns an error instead of mislabeling HEIC bytes when conversion fails", async () => {
    postFindFirstMock.mockResolvedValue({ id: "post_1" });
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1" });
    convertHeicToJpegMock.mockRejectedValue(new Error("Invalid HEIC"));
    const { GET } = await import("@/app/api/media/route");
    const response = await GET(new Request(`http://localhost/api/media?src=${encodeURIComponent(LEGACY_HEIC_URL)}`));
    expect(response.status).toBe(502);
  });
});
