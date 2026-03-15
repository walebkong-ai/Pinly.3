import { describe, expect, test } from "vitest";
import {
  boundsCrossAntimeridian,
  canonicalizeViewportForDataQuery,
  createViewportFingerprint,
  FULL_WORLD_BOUNDS,
  getBoundsCenter,
  getLongitudeFilter,
  normalizeMapBounds
} from "@/lib/map-viewport";

describe("map viewport helpers", () => {
  test("normalizes wrapped globe bounds without losing the antimeridian crossing", () => {
    const bounds = normalizeMapBounds({
      north: 20,
      south: -20,
      east: 190,
      west: 170
    });

    expect(bounds.east).toBeCloseTo(-170);
    expect(bounds.west).toBeCloseTo(170);
    expect(boundsCrossAntimeridian(bounds)).toBe(true);
  });

  test("computes the correct center when bounds cross the antimeridian", () => {
    const center = getBoundsCenter({
      north: 20,
      south: -20,
      east: -170,
      west: 170
    });

    expect(center.latitude).toBe(0);
    expect(Math.abs(center.longitude)).toBe(180);
  });

  test("builds a wrapped longitude filter for antimeridian bounds", () => {
    expect(
      getLongitudeFilter({
        north: 20,
        south: -20,
        east: -170,
        west: 170
      })
    ).toEqual({
      kind: "wrapped",
      east: -170,
      west: 170
    });
  });

  test("freezes world-stage fetches to a single full-world query", () => {
    expect(
      canonicalizeViewportForDataQuery({
        zoom: 3.6,
        bounds: {
          north: 54,
          south: -28,
          east: 142,
          west: -123
        }
      })
    ).toEqual({
      zoom: 2,
      bounds: FULL_WORLD_BOUNDS
    });
  });

  test("only changes the bubble-stage query when the same-place split threshold changes", () => {
    const clusteredBubbleViewport = canonicalizeViewportForDataQuery({
      zoom: 12.4,
      bounds: {
        north: 51,
        south: 48,
        east: 3,
        west: 1
      }
    });
    const splitBubbleViewport = canonicalizeViewportForDataQuery({
      zoom: 13.2,
      bounds: {
        north: 51,
        south: 48,
        east: 3,
        west: 1
      }
    });

    expect(clusteredBubbleViewport.zoom).toBe(12);
    expect(splitBubbleViewport.zoom).toBe(13);
    expect(createViewportFingerprint(clusteredBubbleViewport)).not.toBe(createViewportFingerprint(splitBubbleViewport));
  });
});
