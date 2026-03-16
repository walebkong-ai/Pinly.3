import { describe, expect, test } from "vitest";
import { getMarkerAnchor, getMarkerHtml, getMarkerPopupOffset } from "@/lib/map-marker-rendering";
import type { MapMarker, PostSummary } from "@/types/app";

function makePost(overrides: Partial<PostSummary> = {}): PostSummary {
  const userId = overrides.userId ?? "viewer";

  return {
    id: overrides.id ?? "post-1",
    userId,
    mediaType: "IMAGE",
    mediaUrl: "/uploads/example.jpg",
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
      username: userId === "viewer" ? "avery" : "maya",
      avatarUrl: "/avatars/maya.jpg"
    },
    ...overrides
  };
}

function makePinMarker(): MapMarker {
  return {
    type: "pin",
    id: "pin-post-1",
    latitude: 48.8566,
    longitude: 2.3522,
    post: makePost()
  };
}

function makeBubbleMarker(): MapMarker {
  return {
    type: "profileBubble",
    id: "bubble-post-1",
    latitude: 48.8566,
    longitude: 2.3522,
    post: makePost()
  };
}

describe("map marker rendering", () => {
  test("renders the standard pin stage as an SVG pin silhouette", () => {
    const html = getMarkerHtml(makePinMarker(), false, "default");

    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 32 44"');
    expect(html).toContain("<path");
    expect(html).toContain('fill="#185538"');
  });

  test("uses a stronger selected treatment and satellite shadow for active pins", () => {
    const html = getMarkerHtml(makePinMarker(), true, "satellite");

    expect(html).toContain('fill="#38B6C9"');
    expect(html).toContain("drop-shadow(0 16px 20px rgba(3, 14, 22, 0.4))");
  });

  test("keeps pins bottom-anchored and other stages centered", () => {
    expect(getMarkerAnchor(makePinMarker())).toBe("bottom");
    expect(getMarkerAnchor(makeBubbleMarker())).toBe("center");
  });

  test("raises popup previews enough to clear the pin tip", () => {
    expect(getMarkerPopupOffset(makePinMarker())).toBe(30);
    expect(getMarkerPopupOffset(makeBubbleMarker())).toBe(24);
  });

  test("preserves profile bubble rendering at the closest zoom stage", () => {
    const html = getMarkerHtml(makeBubbleMarker(), true, "default");

    expect(html).toContain("<img");
    expect(html).toContain('border:3px solid #38B6C9');
  });
});
