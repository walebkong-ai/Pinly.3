import { describe, expect, test } from "vitest";
import {
  ARCGIS_WORLD_IMAGERY_ATTRIBUTION,
  ARCGIS_WORLD_IMAGERY_TILE_URL,
  DEFAULT_MAP_STYLE_URL,
  GLOBE_PROJECTION,
  MAP_MODE_STORAGE_KEY,
  MAPTILER_SATELLITE_TILESET_ID,
  MERCATOR_PROJECTION,
  SATELLITE_LAYER_ID,
  SATELLITE_SOURCE_ID,
  getMapProjection,
  getSatelliteLayer,
  getSatelliteSource,
  getSatelliteTileJsonUrl,
  isSatelliteModeAvailable,
  parseStoredMapMode
} from "@/lib/map-style";

describe("map style helpers", () => {
  test("keeps the current default style URL for the base vector map", () => {
    expect(DEFAULT_MAP_STYLE_URL).toBe("https://basemaps.cartocdn.com/gl/positron-gl-style/style.json");
  });

  test("reports satellite mode availability for the built-in fallback and keyed providers", () => {
    expect(isSatelliteModeAvailable("")).toBe(true);
    expect(isSatelliteModeAvailable("   ")).toBe(true);
    expect(isSatelliteModeAvailable("demo-key")).toBe(true);
  });

  test("parses only supported stored map modes", () => {
    expect(MAP_MODE_STORAGE_KEY).toBe("pinly:map-visual-mode");
    expect(parseStoredMapMode("default")).toBe("default");
    expect(parseStoredMapMode("satellite")).toBe("satellite");
    expect(parseStoredMapMode("terrain")).toBeNull();
    expect(parseStoredMapMode("")).toBeNull();
    expect(parseStoredMapMode(null)).toBeNull();
  });

  test("switches projection by visual mode", () => {
    expect(getMapProjection("default")).toEqual(GLOBE_PROJECTION);
    expect(getMapProjection("satellite")).toEqual(MERCATOR_PROJECTION);
  });

  test("builds a raster satellite source backed by ArcGIS World Imagery when no key is configured", () => {
    const source = getSatelliteSource("");

    expect(source).toMatchObject({
      type: "raster",
      attribution: ARCGIS_WORLD_IMAGERY_ATTRIBUTION,
      tiles: [ARCGIS_WORLD_IMAGERY_TILE_URL],
      tileSize: 256,
      maxzoom: 23
    });
  });

  test("builds a raster satellite source backed by MapTiler TileJSON", () => {
    const apiKey = "test key";
    const source = getSatelliteSource(apiKey);

    expect(source).toMatchObject({
      type: "raster",
      url: getSatelliteTileJsonUrl(apiKey)
    });
    expect(getSatelliteTileJsonUrl(apiKey)).toContain(MAPTILER_SATELLITE_TILESET_ID);
    expect(getSatelliteTileJsonUrl(apiKey)).toContain("test%20key");
  });

  test("builds a stable raster layer definition for runtime toggling", () => {
    expect(getSatelliteLayer()).toEqual({
      id: SATELLITE_LAYER_ID,
      type: "raster",
      source: SATELLITE_SOURCE_ID
    });
  });
});
