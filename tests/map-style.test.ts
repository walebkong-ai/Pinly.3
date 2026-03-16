import { describe, expect, test } from "vitest";
import {
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

  test("reports satellite mode availability only when a key is configured", () => {
    expect(isSatelliteModeAvailable("")).toBe(false);
    expect(isSatelliteModeAvailable("   ")).toBe(false);
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

  test("falls back to default style when satellite mode has no key", () => {
    expect(
      getMapStyle({
        mode: "satellite",
        satelliteApiKey: ""
      })
    ).toBe(DEFAULT_MAP_STYLE_URL);
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
