import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TEST_IMAGE_URL } from "@/tests/fixtures/media";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const getVisibleUserIdsMock = vi.fn();
const postFindFirstMock = vi.fn();
const userFindFirstMock = vi.fn();
const createSignedSupabaseObjectUrlMock = vi.fn();
const enforceRateLimitMock = vi.fn();

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

vi.mock("@/lib/supabase-storage", () => ({
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
  });
});
