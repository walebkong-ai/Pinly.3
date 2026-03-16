import { describe, expect, test } from "vitest";
import { getMarkerAnchor, getMarkerHtml, getMarkerPopupOffset, getMarkerVisualSize } from "@/lib/map-marker-rendering";
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

function makeCityClusterMarker(postCount = 14): MapMarker {
  return {
    type: "cityCluster",
    id: "city-paris::france",
    latitude: 48.8566,
    longitude: 2.3522,
    city: "Paris",
    country: "France",
    postCount,
    friendCount: 5,
    visitors: [makePost().user]
  };
}

function makePlaceClusterMarker(postCount = 7): MapMarker {
  return {
    type: "placeCluster",
    id: "place-cafe-example",
    latitude: 48.8566,
    longitude: 2.3522,
    placeName: "Cafe Example",
    city: "Paris",
    country: "France",
    postCount,
    visitors: [makePost().user],
    previewPost: {
      id: "post-1",
      caption: "A travel memory worth keeping.",
      mediaType: "IMAGE",
      mediaUrl: "/uploads/example.jpg",
      thumbnailUrl: null,
      placeName: "Cafe Example",
      city: "Paris",
      country: "France",
      visitedAt: new Date("2025-01-10T12:00:00.000Z"),
      user: makePost().user
    }
  };
}

describe("map marker rendering", () => {
  test("renders every marker state inside the shared pin shell", () => {
    const markers = [makePinMarker(), makeBubbleMarker(), makeCityClusterMarker(), makePlaceClusterMarker()];

    for (const marker of markers) {
      const html = getMarkerHtml(marker, false, "default");

      expect(html).toContain('data-pin-shell="true"');
      expect(html).toContain(`data-marker-type="${marker.type}"`);
      expect(html).toContain("<svg");
      expect(html).toContain('viewBox="0 0 32 44"');
      expect(html).toContain("<path");
    }
  });

  test("uses a stronger selected treatment and satellite shadow for active pins", () => {
    const html = getMarkerHtml(makePinMarker(), true, "satellite");

    expect(html).toContain('fill="#38B6C9"');
    expect(html).toContain("drop-shadow(0 18px 24px rgba(3, 14, 22, 0.46))");
  });

  test("renders count markers inside the pin head instead of standalone circles", () => {
    const cityHtml = getMarkerHtml(makeCityClusterMarker(), false, "default");
    const placeHtml = getMarkerHtml(makePlaceClusterMarker(), true, "default");

    expect(cityHtml).toContain(">14<");
    expect(cityHtml).toContain('data-marker-type="cityCluster"');
    expect(placeHtml).toContain(">7<");
    expect(placeHtml).toContain('data-marker-type="placeCluster"');
    expect(placeHtml).toContain('fill="#1691A3"');
  });

  test("scales pin size up as represented memory count increases", () => {
    const singlePinSize = getMarkerVisualSize(makePinMarker());
    const mediumClusterSize = getMarkerVisualSize(makePlaceClusterMarker(5));
    const largeClusterSize = getMarkerVisualSize(makeCityClusterMarker(14));

    expect(mediumClusterSize.height).toBeGreaterThan(singlePinSize.height);
    expect(mediumClusterSize.width).toBeGreaterThan(singlePinSize.width);
    expect(largeClusterSize.height).toBeGreaterThan(mediumClusterSize.height);
    expect(largeClusterSize.width).toBeGreaterThan(mediumClusterSize.width);
  });

  test("keeps all marker stages bottom-anchored for a consistent pin tip", () => {
    expect(getMarkerAnchor(makePinMarker())).toBe("bottom");
    expect(getMarkerAnchor(makeBubbleMarker())).toBe("bottom");
    expect(getMarkerAnchor(makeCityClusterMarker())).toBe("bottom");
    expect(getMarkerAnchor(makePlaceClusterMarker())).toBe("bottom");
  });

  test("raises popup previews enough to clear the shared pin silhouette", () => {
    expect(getMarkerPopupOffset(makePinMarker())).toBeGreaterThanOrEqual(35);
    expect(getMarkerPopupOffset(makeBubbleMarker())).toBeGreaterThanOrEqual(38);
    expect(getMarkerPopupOffset(makeCityClusterMarker())).toBeGreaterThan(getMarkerPopupOffset(makePinMarker()));
    expect(getMarkerPopupOffset(makePlaceClusterMarker(5))).toBeGreaterThan(getMarkerPopupOffset(makePinMarker()));
  });

  test("renders avatar markers inside the same pin shell", () => {
    const html = getMarkerHtml(makeBubbleMarker(), true, "default");

    expect(html).toContain('data-marker-type="profileBubble"');
    expect(html).toContain("<img");
    expect(html).toContain('fill="#38B6C9"');
  });
});
