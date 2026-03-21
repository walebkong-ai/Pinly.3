import { describe, expect, test } from "vitest";
import {
  backFromPostPreview,
  closeMapPreview,
  getSelectedLocationPreviewMarkerId,
  openFocusedPostPreview,
  openLocationPreview,
  openPostPreview,
  syncPreviewStateWithMarkers
} from "@/lib/map-preview-state";
import type { MapMarker, PostSummary, UserSummary } from "@/types/app";

function createUserSummary(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    id: "user-1",
    name: "Traveler",
    username: "traveler",
    avatarUrl: null,
    ...overrides
  };
}

function createPostSummary(overrides: Partial<PostSummary> = {}): PostSummary {
  return {
    id: "post-1",
    userId: "user-1",
    mediaType: "IMAGE",
    mediaUrl: "https://example.com/photo.jpg",
    thumbnailUrl: null,
    caption: "A memory",
    placeName: "Cafe Central",
    city: "Vienna",
    country: "Austria",
    latitude: 48.2082,
    longitude: 16.3738,
    visitedAt: "2026-03-01T00:00:00.000Z",
    createdAt: "2026-03-02T00:00:00.000Z",
    user: createUserSummary(),
    ...overrides
  };
}

function createLocationCluster(post: PostSummary): MapMarker {
  return {
    type: "placeCluster",
    id: "cluster-1",
    latitude: post.latitude,
    longitude: post.longitude,
    placeName: post.placeName,
    city: post.city,
    country: post.country,
    postCount: 2,
    visitors: [post.user],
    postIds: [post.id],
    previewPost: {
      id: post.id,
      caption: post.caption,
      mediaType: post.mediaType,
      mediaUrl: post.mediaUrl,
      thumbnailUrl: post.thumbnailUrl,
      placeName: post.placeName,
      city: post.city,
      country: post.country,
      visitedAt: post.visitedAt,
      user: post.user
    },
    posts: [post]
  };
}

describe("map preview state", () => {
  test("keeps a same-location post open while its source cluster still contains it", () => {
    const post = createPostSummary();
    const state = openPostPreview(post, "cluster-1");

    expect(syncPreviewStateWithMarkers(state, [createLocationCluster(post)])).toEqual(state);
  });

  test("falls back to a standalone post preview if the return cluster disappears", () => {
    const post = createPostSummary();
    const state = openPostPreview(post, "cluster-1");
    const standaloneMarker: MapMarker = {
      type: "pin",
      id: "pin-1",
      latitude: post.latitude,
      longitude: post.longitude,
      post
    };

    expect(syncPreviewStateWithMarkers(state, [standaloneMarker])).toEqual(openPostPreview(post, null));
  });

  test("closes the preview if neither the source cluster nor the standalone post remains visible", () => {
    const post = createPostSummary();

    expect(syncPreviewStateWithMarkers(openPostPreview(post, "cluster-1"), [])).toEqual(closeMapPreview());
    expect(syncPreviewStateWithMarkers(openLocationPreview("cluster-1"), [])).toEqual(closeMapPreview());
  });

  test("backs from a same-location post to the source cluster instead of closing everything", () => {
    const post = createPostSummary();

    expect(backFromPostPreview(openPostPreview(post, "cluster-1"))).toEqual(openLocationPreview("cluster-1"));
  });

  test("opens the grouped same-location post preview with a return marker", () => {
    const post = createPostSummary();

    expect(openFocusedPostPreview([createLocationCluster(post)], post.id)).toEqual(openPostPreview(post, "cluster-1"));
  });

  test("only exposes a selected location marker while the same-location sheet is open", () => {
    const post = createPostSummary();

    expect(getSelectedLocationPreviewMarkerId(openLocationPreview("cluster-1"))).toBe("cluster-1");
    expect(getSelectedLocationPreviewMarkerId(openPostPreview(post, "cluster-1"))).toBeNull();
  });

  test("opens the standalone focused post preview when the marker is not grouped", () => {
    const post = createPostSummary();
    const standaloneMarker: MapMarker = {
      type: "profileBubble",
      id: "bubble-1",
      latitude: post.latitude,
      longitude: post.longitude,
      post
    };

    expect(openFocusedPostPreview([standaloneMarker], post.id)).toEqual(openPostPreview(post));
  });
});
