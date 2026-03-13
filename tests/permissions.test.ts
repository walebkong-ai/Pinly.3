import { describe, expect, test } from "vitest";
import { buildVisibleUserIds, canViewerAccessPost, postIsWithinBounds } from "@/lib/permissions";
import { normalizeFriendPair } from "@/lib/friendships";

describe("friend visibility", () => {
  test("accepted friends can access each other posts", () => {
    const viewerId = "user_1";
    const friendships = [normalizeFriendPair("user_1", "user_2"), normalizeFriendPair("user_3", "user_4")];
    const visibleUserIds = buildVisibleUserIds(viewerId, friendships.map((pair) => ({ ...pair, id: "f", createdAt: new Date() })));

    expect(visibleUserIds).toContain("user_1");
    expect(visibleUserIds).toContain("user_2");
    expect(canViewerAccessPost("user_1", { userId: "user_2" }, visibleUserIds)).toBe(true);
  });

  test("non-friends cannot access protected posts", () => {
    const visibleUserIds = buildVisibleUserIds("user_1", []);

    expect(canViewerAccessPost("user_1", { userId: "user_9" }, visibleUserIds)).toBe(false);
  });
});

describe("map bounds", () => {
  test("returns true for records inside viewport", () => {
    expect(
      postIsWithinBounds(40.7, -73.9, {
        north: 41,
        south: 40,
        east: -73,
        west: -74.2
      })
    ).toBe(true);
  });

  test("returns false for records outside viewport", () => {
    expect(
      postIsWithinBounds(48.85, 2.35, {
        north: 41,
        south: 40,
        east: -73,
        west: -74.2
      })
    ).toBe(false);
  });
});
