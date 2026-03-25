import { describe, expect, test } from "vitest";
import { clampKeyboardOffset, computeKeyboardViewportState, KEYBOARD_OFFSET_THRESHOLD_PX } from "@/lib/keyboard-offset";

describe("keyboard offset helpers", () => {
  test("returns zero for invalid or negative offsets", () => {
    expect(clampKeyboardOffset(-12, 844)).toBe(0);
    expect(clampKeyboardOffset(Number.NaN, 844)).toBe(0);
    expect(clampKeyboardOffset(120, 0)).toBe(0);
  });

  test("clamps offsets so stale values cannot consume most of the viewport", () => {
    expect(clampKeyboardOffset(900, 844)).toBeLessThan(700);
  });

  test("treats an editable focus plus a large viewport gap as an open keyboard", () => {
    const result = computeKeyboardViewportState({
      baselineHeight: 844,
      layoutViewportHeight: 844,
      visualViewportHeight: 532,
      visualViewportOffsetTop: 0,
      hasEditableFocus: true
    });

    expect(result.isKeyboardOpen).toBe(true);
    expect(result.keyboardOffset).toBeGreaterThan(KEYBOARD_OFFSET_THRESHOLD_PX);
  });

  test("ignores viewport changes when no editable control is focused", () => {
    const result = computeKeyboardViewportState({
      baselineHeight: 844,
      layoutViewportHeight: 844,
      visualViewportHeight: 532,
      visualViewportOffsetTop: 0,
      hasEditableFocus: false
    });

    expect(result.isKeyboardOpen).toBe(false);
    expect(result.keyboardOffset).toBe(0);
  });

  test("keeps the keyboard closed for tiny viewport shifts", () => {
    const result = computeKeyboardViewportState({
      baselineHeight: 844,
      layoutViewportHeight: 844,
      visualViewportHeight: 800,
      visualViewportOffsetTop: 0,
      hasEditableFocus: true
    });

    expect(result.isKeyboardOpen).toBe(false);
    expect(result.keyboardOffset).toBe(0);
  });
});
