import type { StyleSpecification } from "maplibre-gl";
import type { MapVisualMode } from "@/types/app";

export const DEFAULT_MAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const MAPTILER_SATELLITE_TILESET_ID = "satellite-v2";
export const MAP_MODE_STORAGE_KEY = "pinly:map-visual-mode";
export type MapStyleValue = string | StyleSpecification;

export function isSatelliteModeAvailable(apiKey?: string | null) {
  return Boolean(apiKey?.trim());
}

export function parseStoredMapMode(value?: string | null): MapVisualMode | null {
  return value === "default" || value === "satellite" ? value : null;
}

export function getSatelliteTileJsonUrl(apiKey: string) {
  return `https://api.maptiler.com/tiles/${MAPTILER_SATELLITE_TILESET_ID}/tiles.json?key=${encodeURIComponent(apiKey)}`;
}

export function getMapStyle({
  mode,
  satelliteApiKey
}: {
  mode: MapVisualMode;
  satelliteApiKey?: string | null;
}): MapStyleValue {
  if (mode !== "satellite" || !isSatelliteModeAvailable(satelliteApiKey)) {
    return DEFAULT_MAP_STYLE_URL;
  }

  const trimmedApiKey = satelliteApiKey?.trim();

  if (!trimmedApiKey) {
    return DEFAULT_MAP_STYLE_URL;
  }

  return {
    version: 8,
    name: "Pinly Satellite",
    sources: {
      "pinly-satellite": {
        type: "raster",
        url: getSatelliteTileJsonUrl(trimmedApiKey),
        tileSize: 256
      }
    },
    layers: [
      {
        id: "pinly-satellite-background",
        type: "background",
        paint: {
          "background-color": "#08111a"
        }
      },
      {
        id: "pinly-satellite-layer",
        type: "raster",
        source: "pinly-satellite"
      }
    ]
  } satisfies StyleSpecification;
}
