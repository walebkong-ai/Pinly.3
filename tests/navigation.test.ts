import { describe, expect, test } from "vitest";
import { canUseHistoryBack } from "@/lib/navigation";

describe("navigation helpers", () => {
  test("only uses history back when there is same-origin history", () => {
    expect(canUseHistoryBack(2, "https://pinly.app/feed", "https://pinly.app")).toBe(true);
    expect(canUseHistoryBack(1, "https://pinly.app/feed", "https://pinly.app")).toBe(false);
    expect(canUseHistoryBack(3, "", "https://pinly.app")).toBe(false);
    expect(canUseHistoryBack(3, "https://example.com/page", "https://pinly.app")).toBe(false);
  });
});
