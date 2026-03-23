import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const enforceRateLimitMock = vi.fn();
const userFindUniqueMock = vi.fn();
const reportCreateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock
    },
    report: {
      create: reportCreateMock
    }
  }
}));

describe("user report route", () => {
  beforeEach(() => {
    authMock.mockReset();
    enforceRateLimitMock.mockReset();
    userFindUniqueMock.mockReset();
    reportCreateMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
    enforceRateLimitMock.mockResolvedValue(null);
    userFindUniqueMock.mockResolvedValue({
      id: "target_1"
    });
    reportCreateMock.mockResolvedValue({
      id: "report_1"
    });
  });

  test("persists a categorized user report", async () => {
    const { POST } = await import("@/app/api/users/[username]/report/route");
    const response = await POST(
      new Request("http://localhost/api/users/maya/report", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          category: "HARASSMENT",
          details: "Repeated hostile direct requests."
        })
      }),
      {
        params: Promise.resolve({ username: "Maya" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(reportCreateMock).toHaveBeenCalledWith({
      data: {
        reporterId: "viewer_1",
        reportedId: "target_1",
        category: "HARASSMENT",
        reason: "Repeated hostile direct requests.",
        dedupeKey: "USER:viewer_1:target_1:HARASSMENT"
      }
    });
  });

  test("returns success for duplicate reports instead of creating a second row", async () => {
    reportCreateMock.mockRejectedValue({ code: "P2002" });

    const { POST } = await import("@/app/api/users/[username]/report/route");
    const response = await POST(
      new Request("http://localhost/api/users/maya/report", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          category: "SPAM"
        })
      }),
      {
        params: Promise.resolve({ username: "maya" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, duplicate: true });
  });

  test("rejects malformed report payloads", async () => {
    const { POST } = await import("@/app/api/users/[username]/report/route");
    const response = await POST(
      new Request("http://localhost/api/users/maya/report", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          details: "Missing category"
        })
      }),
      {
        params: Promise.resolve({ username: "maya" })
      }
    );

    expect(response.status).toBe(400);
    expect(reportCreateMock).not.toHaveBeenCalled();
  });
});
