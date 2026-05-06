import { describe, expect, test } from "vitest";
import { getPostMediaAspectRatioStyle, getPostMediaAspectRatioValue } from "@/lib/post-display";

describe("post media display helpers", () => {
  test("uses selected Instagram-style aspect metadata", () => {
    expect(getPostMediaAspectRatioStyle({ mediaAspectRatio: "4:5" })).toBe("0.8 / 1");
    expect(getPostMediaAspectRatioStyle({ mediaAspectRatio: "3:4" })).toBe("0.75 / 1");
    expect(getPostMediaAspectRatioStyle({ mediaAspectRatio: "1:1" })).toBe("1 / 1");
    expect(getPostMediaAspectRatioStyle({ mediaAspectRatio: "1.91:1" })).toBe("1.91 / 1");
  });

  test("falls back to image dimensions before legacy framing", () => {
    expect(getPostMediaAspectRatioValue({ mediaWidth: 1080, mediaHeight: 1350 })).toBe(0.8);
    expect(getPostMediaAspectRatioValue({})).toBe(4 / 3);
    expect(getPostMediaAspectRatioValue(null)).toBe(4 / 3);
  });
});
