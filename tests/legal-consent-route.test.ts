import { beforeEach, describe, expect, test, vi } from "vitest";

const { cookiesMock, setCookieMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  setCookieMock: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock
}));

describe("legal consent route", () => {
  beforeEach(() => {
    vi.resetModules();
    setCookieMock.mockReset();
    cookiesMock.mockReset();
    cookiesMock.mockResolvedValue({ set: setCookieMock });
  });

  test("sets an httpOnly legal consent cookie after acceptance", async () => {
    const { POST } = await import("@/app/api/auth/legal-consent/route");
    const response = await POST(
      new Request("http://localhost/api/auth/legal-consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acceptLegal: true })
      })
    );

    expect(response.status).toBe(200);
    expect(setCookieMock).toHaveBeenCalledWith(
      "pinly_legal_signup",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/"
      })
    );
  });

  test("rejects requests that do not accept the legal terms", async () => {
    const { POST } = await import("@/app/api/auth/legal-consent/route");
    const response = await POST(
      new Request("http://localhost/api/auth/legal-consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acceptLegal: false })
      })
    );

    expect(response.status).toBe(422);
    expect(setCookieMock).not.toHaveBeenCalled();
  });
});
