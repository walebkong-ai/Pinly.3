import { describe, expect, test, vi } from "vitest";
import { resolveConfirmedNetworkStatus } from "@/components/network/network-status-provider";

describe("network status provider", () => {
  test("treats a 404 health response as service reachable", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("Not found", {
        status: 404
      })
    );

    await expect(
      resolveConfirmedNetworkStatus({
        navigatorOnline: false,
        fetcher
      })
    ).resolves.toBe(true);
  });

  test("reports offline when the service health request fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      resolveConfirmedNetworkStatus({
        navigatorOnline: true,
        fetcher
      })
    ).resolves.toBe(false);
  });

  test("falls back to the browser connectivity signal when fetch is unavailable", async () => {
    await expect(
      resolveConfirmedNetworkStatus({
        navigatorOnline: true,
        fetcher: null
      })
    ).resolves.toBe(true);
  });
});
