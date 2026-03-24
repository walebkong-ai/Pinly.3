import { describe, expect, test } from "vitest";
import { clampCoverImageOffsets, getCoverImageBaseScale, getCoverImageSourceRect } from "@/lib/cover-image-crop";

describe("cover image crop helpers", () => {
  test("computes a cover scale for rectangular frames", () => {
    expect(getCoverImageBaseScale(1600, 1200, 264, 330)).toBeCloseTo(0.275);
  });

  test("clamps offsets for a portrait crop frame", () => {
    const clamped = clampCoverImageOffsets({
      imageWidth: 1600,
      imageHeight: 1200,
      frameWidth: 264,
      frameHeight: 330,
      zoom: 1,
      offsetX: 500,
      offsetY: -500
    });

    expect(clamped.offsetX).toBeGreaterThan(0);
    expect(clamped.offsetY).toBe(0);
  });

  test("returns a source crop rectangle inside image bounds", () => {
    const crop = getCoverImageSourceRect({
      imageWidth: 1600,
      imageHeight: 1200,
      frameWidth: 264,
      frameHeight: 330,
      zoom: 1.4,
      offsetX: -50,
      offsetY: 20
    });

    expect(crop.sourceX).toBeGreaterThanOrEqual(0);
    expect(crop.sourceY).toBeGreaterThanOrEqual(0);
    expect(crop.sourceX + crop.sourceWidth).toBeLessThanOrEqual(1600);
    expect(crop.sourceY + crop.sourceHeight).toBeLessThanOrEqual(1200);
  });
});
