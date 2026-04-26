import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const ensureDemoDatasetMock = vi.fn();

vi.mock("@/lib/demo-data", () => ({
  ensureDemoDataset: ensureDemoDatasetMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {}
}));

describe("demo seed route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    ensureDemoDatasetMock.mockReset();
    ensureDemoDatasetMock.mockResolvedValue(undefined);
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("allows non-production demo seeding without a secret", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development"
    };

    const { POST } = await import("@/app/api/demo/seed/route");
    const response = await POST(new Request("http://127.0.0.1:3001/api/demo/seed", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(ensureDemoDatasetMock).toHaveBeenCalledTimes(1);
  });

  test("keeps the route hidden in production when no secret is configured", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production"
    };

    const { POST } = await import("@/app/api/demo/seed/route");
    const response = await POST(new Request("https://pinly.example/api/demo/seed", { method: "POST" }));

    expect(response.status).toBe(404);
    expect(ensureDemoDatasetMock).not.toHaveBeenCalled();
  });

  test("requires the configured secret when one is set", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      DEMO_SEED_SECRET: "dev-secret"
    };

    const { POST } = await import("@/app/api/demo/seed/route");
    const response = await POST(new Request("http://127.0.0.1:3001/api/demo/seed", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(ensureDemoDatasetMock).not.toHaveBeenCalled();
  });
});
