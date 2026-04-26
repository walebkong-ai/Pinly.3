import { describe, expect, test } from "vitest";
import { normalizeAuthCallbackUrl } from "@/lib/auth-client";

describe("auth client helpers", () => {
  test("keeps relative callback URLs intact", () => {
    expect(normalizeAuthCallbackUrl("/map")).toBe("/map");
    expect(normalizeAuthCallbackUrl("/delete-account?deleted=1")).toBe("/delete-account?deleted=1");
  });

  test("converts local absolute callback URLs into safe relative paths", () => {
    expect(normalizeAuthCallbackUrl("http://localhost:3000/delete-account?deleted=1")).toBe("/delete-account?deleted=1");
    expect(normalizeAuthCallbackUrl("http://127.0.0.1:3001/invite/demo-token")).toBe("/invite/demo-token");
  });

  test("falls back to the map for non-local absolute callback URLs", () => {
    expect(normalizeAuthCallbackUrl("https://example.com/elsewhere")).toBe("/map");
    expect(normalizeAuthCallbackUrl("//localhost:3000/map")).toBe("/map");
  });
});
