import { describe, expect, test } from "vitest";
import { canUseHistoryBack } from "@/lib/navigation";

describe("navigation helpers", () => {
  test("only uses history back when there is same-origin history", () => {
    expect(canUseHistoryBack(2, "https://pinly.app/feed", "https://pinly.app")).toBe(true);
    expect(canUseHistoryBack(1, "https://pinly.app/feed", "https://pinly.app")).toBe(false);
    expect(canUseHistoryBack(3, "", "https://pinly.app")).toBe(false);
    expect(canUseHistoryBack(3, "https://example.com/page", "https://pinly.app")).toBe(false);
  });

  test("prefers the client-side history index when Next navigation state is available", () => {
    expect(canUseHistoryBack(1, "", "https://pinly.app", { idx: 2 })).toBe(true);
    expect(canUseHistoryBack(5, "https://example.com/page", "https://pinly.app", { idx: 0 })).toBe(false);
  });
});
