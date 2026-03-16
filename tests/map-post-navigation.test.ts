import { describe, expect, test } from "vitest";
import {
  buildMapPathWithoutFocusedPost,
  buildPostLocationMapHref,
  createFocusedPostViewport,
  parseMapFocusedPostTarget
} from "@/lib/map-post-navigation";

describe("map post navigation helpers", () => {
  test("builds a map href with the post id and coordinates", () => {
    expect(
      buildPostLocationMapHref({
        id: "post-42",
        latitude: 43.6426,
        longitude: -79.3871
      })
    ).toBe("/map?postId=post-42&lat=43.6426&lng=-79.3871");
  });

  test("parses a valid focused-post target from query params", () => {
    const target = parseMapFocusedPostTarget(new URLSearchParams("postId=post-42&lat=43.6426&lng=-79.3871"));

    expect(target).toEqual({
      postId: "post-42",
      latitude: 43.6426,
      longitude: -79.3871,
      key: "post-42:43.6426:-79.3871"
    });
  });

  test("ignores incomplete or invalid focused-post query params", () => {
    expect(parseMapFocusedPostTarget(new URLSearchParams("postId=post-42&lat=abc&lng=-79.3871"))).toBeNull();
    expect(parseMapFocusedPostTarget(new URLSearchParams("lat=43.6426&lng=-79.3871"))).toBeNull();
  });

  test("creates a bubble-stage viewport centered on the tapped post", () => {
    const viewport = createFocusedPostViewport({
      postId: "post-42",
      latitude: 43.6426,
      longitude: -79.3871,
      key: "post-42:43.6426:-79.3871"
    });

    expect(viewport.zoom).toBe(13);
    expect(viewport.bounds.north).toBeCloseTo(43.6876);
    expect(viewport.bounds.south).toBeCloseTo(43.5976);
    expect(viewport.bounds.east).toBeCloseTo(-79.3421);
    expect(viewport.bounds.west).toBeCloseTo(-79.4321);
  });

  test("removes focused-post params while preserving other map query state", () => {
    expect(
      buildMapPathWithoutFocusedPost(
        "/map",
        new URLSearchParams("welcome=1&postId=post-42&lat=43.6426&lng=-79.3871")
      )
    ).toBe("/map?welcome=1");
  });
});
