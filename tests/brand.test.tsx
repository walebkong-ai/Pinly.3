import { describe, expect, test } from "vitest";
import {
  BRAND_LOGO_BORDER_COLOR,
  BRAND_LOGO_FRAME_CLASS_NAME,
  BRAND_LOGO_FRAME_STYLE
} from "@/components/brand";

describe("Brand", () => {
  test("pins the visible logo wrapper border to the exact shared green", () => {
    expect(BRAND_LOGO_FRAME_CLASS_NAME).toContain("border-2");
    expect(BRAND_LOGO_FRAME_STYLE).toMatchObject({ borderColor: BRAND_LOGO_BORDER_COLOR });
    expect(BRAND_LOGO_BORDER_COLOR).toBe("#0f746c");
  });

  test("keeps the border color explicit instead of falling back to palette line tokens", () => {
    expect(BRAND_LOGO_FRAME_STYLE.borderColor).not.toBe("var(--line)");
    expect(BRAND_LOGO_FRAME_STYLE.borderColor).not.toBe("rgba(24, 85, 56, 0.16)");
  });
});
