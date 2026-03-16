import { describe, expect, test } from "vitest";
import {
  ARCGIS_WORLD_IMAGERY_ATTRIBUTION,
  ARCGIS_WORLD_IMAGERY_TILE_URL,
  DEFAULT_MAP_STYLE_URL,
  MAP_MODE_STORAGE_KEY,
  MAPTILER_SATELLITE_TILESET_ID,
  getMapStyle,
  getSatelliteTileJsonUrl,
  isSatelliteModeAvailable,
  parseStoredMapMode
} from "@/lib/map-style";

describe("map style helpers", () => {
  test("keeps the current default style when default mode is selected", () => {
    expect(
      getMapStyle({
        mode: "default"
      })
    ).toBe(DEFAULT_MAP_STYLE_URL);
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

  test("builds a raster satellite style backed by ArcGIS World Imagery when no key is configured", () => {
    const mapStyle = getMapStyle({
      mode: "satellite",
      satelliteApiKey: ""
    });

    expect(mapStyle).toMatchObject({
      version: 8,
      name: "Pinly Satellite",
      sources: {
        "pinly-satellite": {
          type: "raster",
          attribution: ARCGIS_WORLD_IMAGERY_ATTRIBUTION,
          tiles: [ARCGIS_WORLD_IMAGERY_TILE_URL],
          tileSize: 256,
          maxzoom: 23
        }
      },
      layers: [
        { id: "pinly-satellite-background", type: "background" },
        { id: "pinly-satellite-layer", type: "raster", source: "pinly-satellite" }
      ]
    });
  });

  test("builds a raster satellite style backed by MapTiler TileJSON", () => {
    const apiKey = "test key";
    const mapStyle = getMapStyle({
      mode: "satellite",
      satelliteApiKey: apiKey
    });

    expect(mapStyle).toMatchObject({
      version: 8,
      name: "Pinly Satellite",
      sources: {
        "pinly-satellite": {
          type: "raster",
          tileSize: 256,
          url: getSatelliteTileJsonUrl(apiKey)
        }
      },
      layers: [
        { id: "pinly-satellite-background", type: "background" },
        { id: "pinly-satellite-layer", type: "raster", source: "pinly-satellite" }
      ]
    });
    expect(getSatelliteTileJsonUrl(apiKey)).toContain(MAPTILER_SATELLITE_TILESET_ID);
    expect(getSatelliteTileJsonUrl(apiKey)).toContain("test%20key");
  });
});
