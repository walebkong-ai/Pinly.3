import type { ProjectionSpecification, RasterLayerSpecification, RasterSourceSpecification } from "maplibre-gl";
import type { MapVisualMode } from "@/types/app";

export const DEFAULT_MAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const MAPTILER_SATELLITE_TILESET_ID = "satellite-v2";
export const MAP_MODE_STORAGE_KEY = "pinly:map-visual-mode";
export const SATELLITE_SOURCE_ID = "pinly-satellite";
export const SATELLITE_LAYER_ID = "pinly-satellite-layer";
export const ARCGIS_WORLD_IMAGERY_TILE_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const ARCGIS_WORLD_IMAGERY_ATTRIBUTION = "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community";
export const GLOBE_PROJECTION = { type: "globe" } satisfies ProjectionSpecification;
export const MERCATOR_PROJECTION = { type: "mercator" } satisfies ProjectionSpecification;

export function isSatelliteModeAvailable(_apiKey?: string | null) {
  return true;
}

export function parseStoredMapMode(value?: string | null): MapVisualMode | null {
  return value === "default" || value === "satellite" ? value : null;
}

export function getSatelliteTileJsonUrl(apiKey: string) {
  return `https://api.maptiler.com/tiles/${MAPTILER_SATELLITE_TILESET_ID}/tiles.json?key=${encodeURIComponent(apiKey)}`;
}

export function getMapProjection(mode: MapVisualMode): ProjectionSpecification {
  return mode === "satellite" ? MERCATOR_PROJECTION : GLOBE_PROJECTION;
}

export function getSatelliteSource(satelliteApiKey?: string | null): RasterSourceSpecification {
  const trimmedApiKey = satelliteApiKey?.trim();

  if (!trimmedApiKey) {
    return {
      type: "raster",
      tiles: [ARCGIS_WORLD_IMAGERY_TILE_URL],
      tileSize: 256,
      maxzoom: 23,
      attribution: ARCGIS_WORLD_IMAGERY_ATTRIBUTION
    };
  }

  return {
    type: "raster",
    url: getSatelliteTileJsonUrl(trimmedApiKey)
  };
}

export function getSatelliteLayer(): RasterLayerSpecification {
  return {
    id: SATELLITE_LAYER_ID,
    type: "raster",
    source: SATELLITE_SOURCE_ID
  };
}
