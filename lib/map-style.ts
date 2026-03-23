import type { StyleSpecification } from "maplibre-gl";
import type { MapVisualMode } from "@/types/app";

export const DEFAULT_MAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const MAPTILER_SATELLITE_TILESET_ID = "satellite-v2";
export const MAP_MODE_STORAGE_KEY = "pinly:map-visual-mode";
export const ARCGIS_WORLD_IMAGERY_TILE_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const ARCGIS_WORLD_IMAGERY_ATTRIBUTION = "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community";
export type MapStyleValue = string | StyleSpecification;

const BLANK_E2E_MAP_STYLE = {
  version: 8,
  name: "Pinly E2E Blank",
  sources: {},
  layers: [
    {
      id: "pinly-e2e-background",
      type: "background",
      paint: {
        "background-color": "#f3ecdf"
      }
    }
  ]
} satisfies StyleSpecification;

export function isSatelliteModeAvailable(_apiKey?: string | null) {
  return true;
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
  if (process.env.NEXT_PUBLIC_E2E_MAP_STYLE === "blank") {
    return BLANK_E2E_MAP_STYLE;
  }

  if (mode !== "satellite" || !isSatelliteModeAvailable(satelliteApiKey)) {
    return DEFAULT_MAP_STYLE_URL;
  }

  const trimmedApiKey = satelliteApiKey?.trim();

  if (!trimmedApiKey) {
    return {
      version: 8,
      name: "Pinly Satellite",
      sources: {
        "pinly-satellite": {
          type: "raster",
          tiles: [ARCGIS_WORLD_IMAGERY_TILE_URL],
          tileSize: 256,
          maxzoom: 23,
          attribution: ARCGIS_WORLD_IMAGERY_ATTRIBUTION
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
