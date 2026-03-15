import { describe, expect, test } from "vitest";
import { clampAvatarOffsets, getAvatarBaseScale, getAvatarSourceRect } from "@/lib/avatar-crop";

describe("avatar crop helpers", () => {
  test("computes a cover scale for portrait images", () => {
    expect(getAvatarBaseScale(600, 900, 240)).toBeCloseTo(0.4);
  });

  test("clamps offsets so the crop never exposes empty space", () => {
    const clamped = clampAvatarOffsets({
      imageWidth: 600,
      imageHeight: 600,
      frameSize: 240,
      zoom: 1,
      offsetX: 400,
      offsetY: -400
    });

    expect(clamped.offsetX).toBe(0);
    expect(clamped.offsetY).toBe(0);
  });

  test("returns a source crop rectangle inside image bounds", () => {
    const crop = getAvatarSourceRect({
      imageWidth: 1200,
      imageHeight: 800,
      frameSize: 240,
      zoom: 1.5,
      offsetX: -40,
      offsetY: 25
    });

    expect(crop.sourceX).toBeGreaterThanOrEqual(0);
    expect(crop.sourceY).toBeGreaterThanOrEqual(0);
    expect(crop.sourceX + crop.sourceWidth).toBeLessThanOrEqual(1200);
    expect(crop.sourceY + crop.sourceHeight).toBeLessThanOrEqual(800);
  });
});
