import { getMapStage } from "@/lib/map-data";

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type MapViewport = {
  zoom: number;
  bounds: MapBounds;
};

export type LongitudeFilter =
  | { kind: "all" }
  | { kind: "between"; east: number; west: number }
  | { kind: "wrapped"; east: number; west: number };

export const FULL_WORLD_BOUNDS: MapBounds = Object.freeze({
  north: 85,
  south: -85,
  east: 180,
  west: -180
});

const VIEWPORT_DECIMALS = 4;
const VIEWPORT_ZOOM_DECIMALS = 3;
const WORLD_SPAN = 360;
const WORLD_EPSILON = 0.01;

function clampLatitude(latitude: number) {
  return Math.max(-90, Math.min(90, latitude));
}

function roundValue(value: number, decimals: number) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

export function normalizeLongitude(longitude: number) {
  if (!Number.isFinite(longitude)) {
    return 0;
  }

  const wrapped = ((longitude + 180) % WORLD_SPAN + WORLD_SPAN) % WORLD_SPAN - 180;

  if (wrapped === -180 && longitude > 0) {
    return 180;
  }

  return wrapped;
}

export function normalizeMapBounds(bounds: MapBounds): MapBounds {
  return {
    north: clampLatitude(Math.max(bounds.north, bounds.south)),
    south: clampLatitude(Math.min(bounds.north, bounds.south)),
    east: normalizeLongitude(bounds.east),
    west: normalizeLongitude(bounds.west)
  };
}

export function getLongitudeSpan(bounds: MapBounds) {
  const normalizedBounds = normalizeMapBounds(bounds);
  const span = normalizedBounds.east - normalizedBounds.west;

  return span >= 0 ? span : WORLD_SPAN + span;
}

export function boundsCoverWorld(bounds: MapBounds) {
  return getLongitudeSpan(bounds) >= WORLD_SPAN - WORLD_EPSILON;
}

export function boundsCrossAntimeridian(bounds: MapBounds) {
  const normalizedBounds = normalizeMapBounds(bounds);

  return !boundsCoverWorld(normalizedBounds) && normalizedBounds.east < normalizedBounds.west;
}

export function getLongitudeFilter(bounds: MapBounds): LongitudeFilter {
  const normalizedBounds = normalizeMapBounds(bounds);

  if (boundsCoverWorld(normalizedBounds)) {
    return { kind: "all" };
  }

  if (boundsCrossAntimeridian(normalizedBounds)) {
    return {
      kind: "wrapped",
      east: normalizedBounds.east,
      west: normalizedBounds.west
    };
  }

  return {
    kind: "between",
    east: normalizedBounds.east,
    west: normalizedBounds.west
  };
}

export function getBoundsCenter(bounds: MapBounds) {
  const normalizedBounds = normalizeMapBounds(bounds);
  const span = getLongitudeSpan(normalizedBounds);

  return {
    latitude: (normalizedBounds.north + normalizedBounds.south) / 2,
    longitude: boundsCoverWorld(normalizedBounds) ? 0 : normalizeLongitude(normalizedBounds.west + span / 2)
  };
}

export function postIsWithinWrappedBounds(
  latitude: number,
  longitude: number,
  bounds: MapBounds
) {
  const normalizedBounds = normalizeMapBounds(bounds);

  if (latitude > normalizedBounds.north || latitude < normalizedBounds.south) {
    return false;
  }

  const normalizedLongitude = normalizeLongitude(longitude);
  const longitudeFilter = getLongitudeFilter(normalizedBounds);

  if (longitudeFilter.kind === "all") {
    return true;
  }

  if (longitudeFilter.kind === "wrapped") {
    return normalizedLongitude >= longitudeFilter.west || normalizedLongitude <= longitudeFilter.east;
  }

  return normalizedLongitude >= longitudeFilter.west && normalizedLongitude <= longitudeFilter.east;
}

export function canonicalizeViewportForDataQuery(viewport: MapViewport): MapViewport {
  const stage = getMapStage(viewport.zoom);
  const bounds = normalizeMapBounds(viewport.bounds);

  if (stage === "world") {
    return {
      zoom: 2,
      bounds: FULL_WORLD_BOUNDS
    };
  }

  if (stage === "city") {
    return {
      zoom: 5,
      bounds
    };
  }

  if (stage === "pin") {
    return {
      zoom: 8,
      bounds
    };
  }

  return {
    zoom: viewport.zoom < 13 ? 12 : 13,
    bounds
  };
}

export function createViewportFingerprint(viewport: MapViewport) {
  const normalizedBounds = normalizeMapBounds(viewport.bounds);

  return [
    roundValue(viewport.zoom, VIEWPORT_ZOOM_DECIMALS),
    roundValue(normalizedBounds.north, VIEWPORT_DECIMALS),
    roundValue(normalizedBounds.south, VIEWPORT_DECIMALS),
    roundValue(normalizedBounds.east, VIEWPORT_DECIMALS),
    roundValue(normalizedBounds.west, VIEWPORT_DECIMALS)
  ].join(":");
}
