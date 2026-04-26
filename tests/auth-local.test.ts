import { describe, expect, test } from "vitest";
import { normalizeLocalAuthUrl, resolveAuthRedirectUrl } from "@/lib/auth-local";

describe("local auth helpers", () => {
  test("keeps the callback path when local hosts differ", () => {
    expect(normalizeLocalAuthUrl("http://localhost:3000/invite/demo-token?from=signin#details", "http://127.0.0.1:3001")).toBe(
      "http://127.0.0.1:3001/invite/demo-token?from=signin#details"
    );
  });

  test("preserves local redirect destinations across localhost and 127.0.0.1", () => {
    expect(resolveAuthRedirectUrl("http://localhost:3000/map?tab=feed", "http://127.0.0.1:3001")).toBe(
      "http://127.0.0.1:3001/map?tab=feed"
    );
  });

  test("rejects non-local redirect targets", () => {
    expect(resolveAuthRedirectUrl("https://example.com/elsewhere", "http://127.0.0.1:3001")).toBe("http://127.0.0.1:3001/");
  });
});
