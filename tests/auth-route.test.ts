import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { authGetMock, authPostMock, enforceRateLimitMock } = vi.hoisted(() => ({
  authGetMock: vi.fn(),
  authPostMock: vi.fn(),
  enforceRateLimitMock: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  handlers: {
    GET: authGetMock,
    POST: authPostMock
  }
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock
}));

describe("auth route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development"
    };
    authGetMock.mockReset();
    authPostMock.mockReset();
    enforceRateLimitMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("normalizes callback-url cookies to the incoming local origin on GET", async () => {
    const headers = new Headers();
    headers.append("set-cookie", "authjs.callback-url=http%3A%2F%2Flocalhost%3A3001; Path=/; HttpOnly; SameSite=Lax");
    authGetMock.mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: "token" }), {
        status: 200,
        headers
      })
    );

    const { GET } = await import("@/app/api/auth/[...nextauth]/route");
    const response = await GET(new Request("http://127.0.0.1:3001/api/auth/csrf") as any);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("http%3A%2F%2F127.0.0.1%3A3001");
  });

  test("prefers the incoming host header when Next reports localhost for a local request", async () => {
    const headers = new Headers();
    headers.append("set-cookie", "authjs.callback-url=http%3A%2F%2Flocalhost%3A3001; Path=/; HttpOnly; SameSite=Lax");
    authGetMock.mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: "token" }), {
        status: 200,
        headers
      })
    );

    const { GET } = await import("@/app/api/auth/[...nextauth]/route");
    const response = await GET(
      new Request("http://localhost:3001/api/auth/csrf", {
        headers: {
          host: "127.0.0.1:3001",
          origin: "http://127.0.0.1:3001"
        }
      }) as any
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("http%3A%2F%2F127.0.0.1%3A3001");
  });

  test("normalizes local auth redirects and callback cookies on credentials POST", async () => {
    const headers = new Headers();
    headers.set("location", "http://localhost:3001/map");
    headers.append("set-cookie", "authjs.callback-url=http%3A%2F%2Flocalhost%3A3001%2Fmap; Path=/; HttpOnly; SameSite=Lax");
    authPostMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers
      })
    );
    enforceRateLimitMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/auth/[...nextauth]/route");
    const response = await POST(new Request("http://127.0.0.1:3001/api/auth/callback/credentials", { method: "POST" }) as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3001/map");
    expect(response.headers.get("set-cookie")).toContain("http%3A%2F%2F127.0.0.1%3A3001%2Fmap");
  });

  test("normalizes JSON redirect payloads for redirect=false credentials sign-in", async () => {
    authPostMock.mockResolvedValue(
      new Response(JSON.stringify({ url: "http://localhost:3001/api/auth/error?error=Configuration" }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );
    enforceRateLimitMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/auth/[...nextauth]/route");
    const response = await POST(new Request("http://127.0.0.1:3001/api/auth/callback/credentials", { method: "POST" }) as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "http://127.0.0.1:3001/api/auth/error?error=Configuration"
    });
  });

  test("preserves session cookies while normalizing legacy callback-url cookies on credentials POST", async () => {
    const headers = new Headers();
    headers.append("set-cookie", "authjs.session-token=session-token-value; Path=/; HttpOnly; SameSite=Lax");
    headers.append("set-cookie", "next-auth.callback-url=http%3A%2F%2Flocalhost%3A3000%2Finvite%2Fdemo-token; Path=/; HttpOnly; SameSite=Lax");
    authPostMock.mockResolvedValue(
      new Response(null, {
        status: 200,
        headers
      })
    );
    enforceRateLimitMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/auth/[...nextauth]/route");
    const response = await POST(new Request("http://127.0.0.1:3001/api/auth/callback/credentials", { method: "POST" }) as any);
    const setCookieValues =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie") ?? ""];

    expect(setCookieValues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("authjs.session-token=session-token-value"),
        expect.stringContaining("next-auth.callback-url=http%3A%2F%2F127.0.0.1%3A3001%2Finvite%2Fdemo-token")
      ])
    );
  });
});
