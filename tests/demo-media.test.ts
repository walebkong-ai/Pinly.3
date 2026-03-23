import { describe, expect, test } from "vitest";
import {
  getBundledDemoAvatarUrl,
  getBundledDemoPostImageUrl,
  getTrustedDemoMediaPrefix,
  isTrustedBundledDemoAvatarPath,
  isTrustedBundledDemoMediaPath
} from "@/lib/demo-media";

describe("bundled demo media", () => {
  test("returns trusted bundled post images for deterministic seeds", () => {
    const imageUrl = getBundledDemoPostImageUrl("Cafe Kitsune|Paris|France");

    expect(imageUrl.startsWith(`${getTrustedDemoMediaPrefix()}/posts/`)).toBe(true);
    expect(isTrustedBundledDemoMediaPath(imageUrl)).toBe(true);
  });

  test("returns deterministic bundled avatars", () => {
    expect(getBundledDemoAvatarUrl("avery")).toBe("/demo-media/avatars/avery.svg");
    expect(getBundledDemoAvatarUrl("Maya")).toBe("/demo-media/avatars/maya.svg");
    expect(isTrustedBundledDemoAvatarPath(getBundledDemoAvatarUrl("guest-user"))).toBe(true);
  });
});
