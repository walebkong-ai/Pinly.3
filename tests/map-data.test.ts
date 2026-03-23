import { describe, expect, test } from "vitest";
import { buildLayerUserIds, buildMapPayload, getMapStage } from "@/lib/map-data";
import { TEST_IMAGE_URL } from "@/tests/fixtures/media";
import type { PostSummary } from "@/types/app";

function makePost(overrides: Partial<PostSummary>): PostSummary {
  const id = overrides.id ?? crypto.randomUUID();
  const userId = overrides.userId ?? "viewer";
  const username = overrides.user?.username ?? (userId === "viewer" ? "avery" : "maya");

  return {
    id,
    userId,
    mediaType: "IMAGE",
    mediaUrl: TEST_IMAGE_URL,
    thumbnailUrl: null,
    caption: "A travel memory worth keeping.",
    placeName: "Cafe Example",
    city: "Paris",
    country: "France",
    latitude: 48.8566,
    longitude: 2.3522,
    visitedAt: new Date("2025-01-10T12:00:00.000Z"),
    createdAt: new Date("2025-01-11T12:00:00.000Z"),
    user: {
      id: userId,
      name: userId === "viewer" ? "Avery Chen" : "Maya Singh",
      username,
      avatarUrl: null
    },
    ...overrides
  };
}

describe("map stage thresholds", () => {
  test("returns the correct stage for each zoom range", () => {
    expect(getMapStage(2)).toBe("world");
    expect(getMapStage(5)).toBe("city");
    expect(getMapStage(8)).toBe("pin");
    expect(getMapStage(12)).toBe("bubble");
  });
});

describe("layer filtering helper", () => {
  test("supports friends, you, and both", () => {
    expect(buildLayerUserIds("viewer", ["friend-1", "friend-2"], "friends")).toEqual(["friend-1", "friend-2"]);
    expect(buildLayerUserIds("viewer", ["friend-1", "friend-2"], "you")).toEqual(["viewer"]);
    expect(buildLayerUserIds("viewer", ["friend-1", "friend-2"], "both")).toEqual(["viewer", "friend-1", "friend-2"]);
  });
});

describe("map payload aggregation", () => {
  const posts = [
    makePost({ id: "paris-1", userId: "viewer" }),
    makePost({ id: "paris-2", userId: "friend-1", latitude: 48.85661, longitude: 2.35221 }),
    makePost({
      id: "tokyo-1",
      userId: "friend-2",
      city: "Tokyo",
      country: "Japan",
      placeName: "Shibuya Crossing",
      latitude: 35.6595,
      longitude: 139.7005,
      user: { id: "friend-2", name: "Noah Brooks", username: "noah", avatarUrl: null }
    }),
    makePost({
      id: "paris-single",
      userId: "friend-3",
      placeName: "Montmartre Steps",
      latitude: 48.8867,
      longitude: 2.3431,
      user: { id: "friend-3", name: "Elena Garcia", username: "elena", avatarUrl: null }
    })
  ];

  test("world stage returns city clusters only", () => {
    const result = buildMapPayload({
      posts,
      zoom: 2,
      center: { latitude: 20, longitude: 10 },
      viewerId: "viewer"
    });

    expect(result.stage).toBe("world");
    expect(result.markers.every((marker) => marker.type === "cityCluster")).toBe(true);
  });

  test("city stage returns hybrid markers and city context", () => {
    const result = buildMapPayload({
      posts,
      zoom: 5,
      center: { latitude: 48.85, longitude: 2.35 },
      viewerId: "viewer"
    });

    expect(result.stage).toBe("city");
    expect(result.cityContext?.city).toBe("Paris");
    expect(result.cityContext?.friendCount).toBe(2);
    expect(result.markers.some((marker) => marker.type === "cityCluster")).toBe(true);
    expect(result.markers.some((marker) => marker.type === "placeCluster" || marker.type === "pin")).toBe(true);
  });

  test("same-location multi-memory markers stay grouped even at the highest zoom", () => {
    const bubbleStage = buildMapPayload({
      posts,
      zoom: 12,
      center: { latitude: 48.85, longitude: 2.35 },
      viewerId: "viewer"
    });

    expect(bubbleStage.markers.some((marker) => marker.type === "placeCluster")).toBe(true);

    const splitStage = buildMapPayload({
      posts,
      zoom: 13,
      center: { latitude: 48.85, longitude: 2.35 },
      viewerId: "viewer"
    });

    const sameLocationMarker = splitStage.markers.find((marker) => marker.type === "placeCluster");

    expect(sameLocationMarker?.type).toBe("placeCluster");
    if (!sameLocationMarker || sameLocationMarker.type !== "placeCluster") {
      throw new Error("Expected same-location marker to stay grouped.");
    }

    expect(sameLocationMarker.posts).toHaveLength(2);
    expect(splitStage.markers.filter((marker) => marker.type === "profileBubble")).toHaveLength(2);
  });
});
