import { describe, expect, test } from "vitest";
import { buildLightweightMapGroups, resolveLayerUserIds } from "@/lib/map-groups";

describe("lightweight map groups", () => {
  test("builds one lightweight group option per friend", () => {
    const groups = buildLightweightMapGroups([
      {
        id: "friend-1",
        name: "Maya Singh",
        username: "maya",
        avatarUrl: null
      }
    ]);

    expect(groups).toEqual([
      {
        id: "friend-1",
        label: "Maya Singh",
        description: "@maya",
        memberIds: ["friend-1"],
        kind: "friend"
      }
    ]);
  });

  test("resolves layer scope with selected lightweight groups", () => {
    expect(
      resolveLayerUserIds({
        viewerId: "viewer-1",
        friendIds: ["friend-1", "friend-2"],
        selectedGroupIds: ["friend-2"],
        layer: "both"
      })
    ).toEqual(["viewer-1", "friend-2"]);
  });
});
