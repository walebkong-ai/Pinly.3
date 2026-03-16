import { describe, expect, test } from "vitest";
import {
  MOBILE_DOUBLE_TAP_TOLERANCE_PX,
  MOBILE_TAP_NAVIGATION_DELAY_MS,
  isDoubleTapCandidate,
  isTapWithinTolerance,
  resolvePendingTapInterruption,
  resolveTouchTapAction
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

  test("queues open on a clean single tap and converts a matching second tap into like", () => {
    const firstTap = {
      x: 120,
      y: 240,
      timestamp: 1_000
    };

    expect(
      resolveTouchTapAction({
        previousTap: null,
        currentTap: firstTap,
        pointerType: "touch",
        moved: false,
        durationMs: 110,
        isInteractiveTarget: false
      })
    ).toEqual({
      action: "queue-open",
      nextTap: firstTap,
      suppressClick: true
    });

    expect(
      resolveTouchTapAction({
        previousTap: firstTap,
        currentTap: {
          x: 132,
          y: 248,
          timestamp: 1_000 + MOBILE_TAP_NAVIGATION_DELAY_MS - 30
        },
        pointerType: "touch",
        moved: false,
        durationMs: 90,
        isInteractiveTarget: false
      })
    ).toEqual({
      action: "like",
      nextTap: null,
      suppressClick: true
    });
  });

  test("ignores moved, long, mouse, and interactive-target gestures", () => {
    const tap = {
      x: 40,
      y: 60,
      timestamp: 2_000
    };

    expect(
      resolveTouchTapAction({
        previousTap: null,
        currentTap: tap,
        pointerType: "touch",
        moved: true,
        durationMs: 90,
        isInteractiveTarget: false
      }).action
    ).toBe("ignore");

    expect(
      resolveTouchTapAction({
        previousTap: null,
        currentTap: tap,
        pointerType: "touch",
        moved: false,
        durationMs: 320,
        isInteractiveTarget: false
      }).action
    ).toBe("ignore");

    expect(
      resolveTouchTapAction({
        previousTap: null,
        currentTap: tap,
        pointerType: "mouse",
        moved: false,
        durationMs: 90,
        isInteractiveTarget: false
      }).action
    ).toBe("ignore");

    expect(
      resolveTouchTapAction({
        previousTap: null,
        currentTap: tap,
        pointerType: "touch",
        moved: false,
        durationMs: 90,
        isInteractiveTarget: true
      }).action
    ).toBe("ignore");
  });

  test("cancels pending open without preserving the tap candidate for controls or outside taps", () => {
    expect(
      resolvePendingTapInterruption({
        targetIsSameSurface: true,
        targetIsInteractive: false
      })
    ).toEqual({
      cancelPendingNavigation: true,
      resetTapCandidate: false
    });

    expect(
      resolvePendingTapInterruption({
        targetIsSameSurface: true,
        targetIsInteractive: true
      })
    ).toEqual({
      cancelPendingNavigation: true,
      resetTapCandidate: true
    });

    expect(
      resolvePendingTapInterruption({
        targetIsSameSurface: false,
        targetIsInteractive: false
      })
    ).toEqual({
      cancelPendingNavigation: true,
      resetTapCandidate: true
    });
  });
});
