import { describe, expect, test } from "vitest";
import {
  MOBILE_DOUBLE_TAP_TOLERANCE_PX,
  MOBILE_TAP_NAVIGATION_DELAY_MS,
  isDoubleTapCandidate,
  isTapWithinTolerance
} from "@/lib/post-tap-gesture";

describe("post tap gesture helpers", () => {
  test("accepts small pointer movement as a tap", () => {
    expect(isTapWithinTolerance({ x: 10, y: 12 }, { x: 16, y: 16 })).toBe(true);
    expect(isTapWithinTolerance({ x: 10, y: 12 }, { x: 28, y: 30 })).toBe(false);
  });

  test("treats only close-in-time, close-in-space taps as a double tap", () => {
    expect(
      isDoubleTapCandidate(
        { x: 100, y: 180, timestamp: 1_000 },
        { x: 112, y: 188, timestamp: 1_000 + MOBILE_TAP_NAVIGATION_DELAY_MS - 20 }
      )
    ).toBe(true);

    expect(
      isDoubleTapCandidate(
        { x: 100, y: 180, timestamp: 1_000 },
        { x: 100 + MOBILE_DOUBLE_TAP_TOLERANCE_PX + 8, y: 188, timestamp: 1_120 }
      )
    ).toBe(false);

    expect(
      isDoubleTapCandidate(
        { x: 100, y: 180, timestamp: 1_000 },
        { x: 112, y: 188, timestamp: 1_000 + MOBILE_TAP_NAVIGATION_DELAY_MS + 40 }
      )
    ).toBe(false);
  });
});
