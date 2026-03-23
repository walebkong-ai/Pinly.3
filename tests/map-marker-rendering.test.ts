import { describe, expect, test } from "vitest";
import {
  getMarkerAnchor,
  getMarkerHtml,
  getMarkerPopupOffset,
  getMarkerRenderPriority,
  getMarkerVisualSize,
  sortMarkersForRender
} from "@/lib/map-marker-rendering";
import { TEST_AVATAR_URL, TEST_IMAGE_URL } from "@/tests/fixtures/media";
import type { MapMarker, PostSummary } from "@/types/app";

function makePost(overrides: Partial<PostSummary> = {}): PostSummary {
  const userId = overrides.userId ?? "viewer";

  return {
    id: overrides.id ?? "post-1",
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
      username: userId === "viewer" ? "avery" : "maya",
      avatarUrl: TEST_AVATAR_URL
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
    visitors: [makePost().user],
    postIds: Array.from({ length: postCount }, (_, index) => `city-post-${index + 1}`)
  };
}

function makePlaceClusterMarker(postCount = 7): MapMarker {
  const posts = Array.from({ length: postCount }, (_, index) =>
    makePost({
      id: `place-post-${index + 1}`,
      visitedAt: new Date(`2025-01-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`)
    })
  );

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
    postIds: posts.map((post) => post.id),
    previewPost: {
      id: "post-1",
      caption: "A travel memory worth keeping.",
      mediaType: "IMAGE",
      mediaUrl: TEST_IMAGE_URL,
      thumbnailUrl: null,
      placeName: "Cafe Example",
      city: "Paris",
      country: "France",
      visitedAt: new Date("2025-01-10T12:00:00.000Z"),
      user: makePost().user
    },
    posts
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

  test("uses a tighter non-selected shadow so big pins do not visually swallow nearby markers", () => {
    const html = getMarkerHtml(makePlaceClusterMarker(7), false, "default");

    expect(html).toContain("drop-shadow(0 10px 14px rgba(56, 182, 201, 0.18))");
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

    expect(singlePinSize).toEqual({ width: 32, height: 44 });
    expect(mediumClusterSize.height - singlePinSize.height).toBeGreaterThanOrEqual(24);
    expect(mediumClusterSize.width - singlePinSize.width).toBeGreaterThanOrEqual(12);
    expect(largeClusterSize.height - mediumClusterSize.height).toBeGreaterThanOrEqual(20);
    expect(largeClusterSize.width - mediumClusterSize.width).toBeGreaterThanOrEqual(12);
  });

  test("keeps lateral growth more restrained than vertical growth so nearby pins stay visible", () => {
    const singlePinSize = getMarkerVisualSize(makePinMarker());
    const mediumClusterSize = getMarkerVisualSize(makePlaceClusterMarker(5));
    const largeClusterSize = getMarkerVisualSize(makeCityClusterMarker(14));

    expect(mediumClusterSize.height - singlePinSize.height).toBeGreaterThan(
      mediumClusterSize.width - singlePinSize.width
    );
    expect(largeClusterSize.height - singlePinSize.height).toBeGreaterThan(
      largeClusterSize.width - singlePinSize.width
    );
    expect(mediumClusterSize.width).toBeLessThan(48);
    expect(largeClusterSize.width).toBeLessThan(62);
  });

  test("assigns higher render priority to bigger, higher-memory markers", () => {
    const singlePinPriority = getMarkerRenderPriority(makePinMarker());
    const mediumClusterPriority = getMarkerRenderPriority(makePlaceClusterMarker(5));
    const largeClusterPriority = getMarkerRenderPriority(makeCityClusterMarker(14));

    expect(mediumClusterPriority).toBeGreaterThan(singlePinPriority);
    expect(largeClusterPriority).toBeGreaterThan(mediumClusterPriority);
    expect(getMarkerRenderPriority(makePinMarker(), true)).toBeGreaterThan(largeClusterPriority);
  });

  test("sorts markers so high-memory pins render last and visually come forward", () => {
    const singlePin = makePinMarker();
    const mediumCluster = makePlaceClusterMarker(5);
    const largeCluster = makeCityClusterMarker(14);

    expect(sortMarkersForRender([largeCluster, singlePin, mediumCluster]).map((marker) => marker.id)).toEqual([
      singlePin.id,
      mediumCluster.id,
      largeCluster.id
    ]);

    expect(sortMarkersForRender([largeCluster, singlePin, mediumCluster], mediumCluster.id).at(-1)?.id).toBe(
      mediumCluster.id
    );
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

  test("renders the bundled legacy avatar placeholder for older profile rows", () => {
    const marker = makeBubbleMarker() as Extract<MapMarker, { type: "profileBubble" }>;
    marker.post = makePost({
      user: {
        ...makePost().user,
        avatarUrl: "/pinly-globe-icon.svg"
      }
    });
    const html = getMarkerHtml(marker, false, "default");

    expect(html).toContain("/pinly-globe-icon.svg");
  });
});
