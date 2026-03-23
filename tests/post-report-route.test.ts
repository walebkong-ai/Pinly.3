import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const enforceRateLimitMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const reportCreateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock
}));

vi.mock("@/lib/data", () => ({
  getVisiblePostById: getVisiblePostByIdMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      create: reportCreateMock
    }
  }
}));

describe("post report route", () => {
  beforeEach(() => {
    authMock.mockReset();
    enforceRateLimitMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    reportCreateMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
    enforceRateLimitMock.mockResolvedValue(null);
    getVisiblePostByIdMock.mockResolvedValue({
      id: "post_1",
      userId: "owner_1",
      user: {
        username: "maya"
      }
    });
    reportCreateMock.mockResolvedValue({
      id: "report_1"
    });
  });

  test("persists a categorized post report", async () => {
    const { POST } = await import("@/app/api/posts/[postId]/report/route");
    const response = await POST(
      new Request("http://localhost/api/posts/post_1/report", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          category: "SPAM",
          details: "Reposted scam itinerary in the caption."
        })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(reportCreateMock).toHaveBeenCalledWith({
      data: {
        reporterId: "viewer_1",
        reportedId: "owner_1",
        postId: "post_1",
        category: "SPAM",
        reason: "Reposted scam itinerary in the caption.",
        dedupeKey: "POST:viewer_1:post_1:SPAM"
      }
    });
  });

  test("rejects reporting your own post", async () => {
    getVisiblePostByIdMock.mockResolvedValue({
      id: "post_1",
      userId: "viewer_1"
    });

    const { POST } = await import("@/app/api/posts/[postId]/report/route");
    const response = await POST(
      new Request("http://localhost/api/posts/post_1/report", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          category: "OTHER"
        })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(400);
    expect(reportCreateMock).not.toHaveBeenCalled();
  });

  test("returns success for duplicate post reports", async () => {
    reportCreateMock.mockRejectedValue({ code: "P2002" });

    const { POST } = await import("@/app/api/posts/[postId]/report/route");
    const response = await POST(
      new Request("http://localhost/api/posts/post_1/report", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          category: "SPAM"
        })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, duplicate: true });
  });
});
