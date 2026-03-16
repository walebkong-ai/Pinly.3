import { describe, expect, test } from "vitest";
import { shouldDispatchGestureLike } from "@/lib/post-tap-gesture";

describe("gesture like guard", () => {
  test("allows a double-tap like only when the post is not already liked and no like request is pending", () => {
    expect(
      shouldDispatchGestureLike({
        isLiked: false,
        isPending: false
      })
    ).toBe(true);

    expect(
      shouldDispatchGestureLike({
        isLiked: true,
        isPending: false
      })
    ).toBe(false);

    expect(
      shouldDispatchGestureLike({
        isLiked: false,
        isPending: true
      })
    ).toBe(false);
  });
});
