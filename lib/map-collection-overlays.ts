import type { MapCollectionOverlay } from "@/types/app";

export type ResolvedMapCollectionOverlay = MapCollectionOverlay & {
  resolvedColor: string;
};

export const COLLECTION_OVERLAY_FALLBACK_COLORS = [
  "#38B6C9",
  "#F97316",
  "#2A9D8F",
  "#F4A261",
  "#577590",
  "#43AA8B",
  "#E76F51",
  "#90BE6D"
] as const;

export function buildResolvedMapCollectionOverlays(collections: MapCollectionOverlay[]): ResolvedMapCollectionOverlay[] {
  let fallbackIndex = 0;

  return collections.map((collection) => {
    if (collection.color) {
      return {
        ...collection,
        resolvedColor: collection.color
      };
    }

    const resolvedColor = COLLECTION_OVERLAY_FALLBACK_COLORS[fallbackIndex % COLLECTION_OVERLAY_FALLBACK_COLORS.length];
    fallbackIndex += 1;

    return {
      ...collection,
      resolvedColor
    };
  });
}

export function buildCollectionOverlayFitBoundsTarget(
  key: string,
  collections: Array<Pick<MapCollectionOverlay, "routePoints">>
) {
  const points = collections.flatMap((collection) =>
    collection.routePoints.filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        point.latitude >= -90 &&
        point.latitude <= 90 &&
        point.longitude >= -180 &&
        point.longitude <= 180
    )
  );

  if (points.length === 0) {
    return null;
  }

  return {
    key,
    points: points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude
    }))
  };
}
