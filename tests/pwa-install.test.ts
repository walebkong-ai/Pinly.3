import { describe, expect, test } from "vitest";
import {
  detectInstallPlatform,
  getInstallInstructions,
  isStandaloneLike
} from "@/lib/pwa-install";

describe("pwa install helpers", () => {
  test("detects iPhone Safari distinctly from other iOS browsers", () => {
    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("ios-safari");

    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/134.0.0.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("ios-browser");
  });

  test("detects android and desktop fallbacks", () => {
    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      )
    ).toBe("android");

    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
      )
    ).toBe("desktop");
  });

  test("recognizes standalone mode from either browser signal", () => {
    expect(isStandaloneLike(true, false)).toBe(true);
    expect(isStandaloneLike(false, true)).toBe(true);
    expect(isStandaloneLike(false, false)).toBe(false);
  });

  test("returns actionable manual install guidance", () => {
    expect(getInstallInstructions("ios-safari").steps[1]).toMatch(/Add to Home Screen/i);
    expect(getInstallInstructions("android").summary).toMatch(/browser menu/i);
  });
});
