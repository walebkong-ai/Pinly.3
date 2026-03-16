import { canonicalizeViewportForDataQuery, normalizeLongitude, type MapViewport } from "@/lib/map-viewport";

const MAP_FOCUSED_POST_ZOOM = 13;
const MAP_FOCUSED_POST_BOUNDS_DELTA = 0.045;
const MAX_MAP_LATITUDE = 85;

export const MAP_FOCUSED_POST_QUERY_PARAM_KEYS = ["postId", "lat", "lng"] as const;

type SearchParamsReader = Pick<URLSearchParams, "get" | "toString">;

export type PostMapLocationTarget = {
  id: string;
  latitude: number;
  longitude: number;
};

export type MapFocusedPostTarget = {
  postId: string;
  latitude: number;
  longitude: number;
  key: string;
};

function clampLatitude(latitude: number) {
  return Math.max(-MAX_MAP_LATITUDE, Math.min(MAX_MAP_LATITUDE, latitude));
}

function parseCoordinate(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  const value = Number.parseFloat(rawValue);

  return Number.isFinite(value) ? value : null;
}

export function buildPostLocationMapHref(post: PostMapLocationTarget) {
  const params = new URLSearchParams({
    postId: post.id,
    lat: String(post.latitude),
    lng: String(post.longitude)
  });

  return `/map?${params.toString()}`;
}

export function parseMapFocusedPostTarget(searchParams: SearchParamsReader): MapFocusedPostTarget | null {
  const postId = searchParams.get("postId")?.trim();
  const latitude = parseCoordinate(searchParams.get("lat"));
  const longitude = parseCoordinate(searchParams.get("lng"));

  if (!postId || latitude === null || longitude === null) {
    return null;
  }

  return {
    postId,
    latitude,
    longitude,
    key: `${postId}:${latitude}:${longitude}`
  };
}

export function createFocusedPostViewport(target: MapFocusedPostTarget): MapViewport {
  return canonicalizeViewportForDataQuery({
    zoom: MAP_FOCUSED_POST_ZOOM,
    bounds: {
      north: clampLatitude(target.latitude + MAP_FOCUSED_POST_BOUNDS_DELTA),
      south: clampLatitude(target.latitude - MAP_FOCUSED_POST_BOUNDS_DELTA),
      east: normalizeLongitude(target.longitude + MAP_FOCUSED_POST_BOUNDS_DELTA),
      west: normalizeLongitude(target.longitude - MAP_FOCUSED_POST_BOUNDS_DELTA)
    }
  });
}

export function buildMapPathWithoutFocusedPost(pathname: string, searchParams: SearchParamsReader) {
  const nextParams = new URLSearchParams(searchParams.toString());

  for (const key of MAP_FOCUSED_POST_QUERY_PARAM_KEYS) {
    nextParams.delete(key);
  }

  const nextQuery = nextParams.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}
