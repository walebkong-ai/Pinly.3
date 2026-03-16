import type { MapMarker, PlaceClusterMarker, PostSummary } from "@/types/app";

export type MapPreviewState =
  | { kind: "idle" }
  | { kind: "location"; markerId: string }
  | { kind: "post"; post: PostSummary; returnMarkerId: string | null };

export const IDLE_MAP_PREVIEW_STATE: MapPreviewState = { kind: "idle" };

export function openLocationPreview(markerId: string): MapPreviewState {
  return {
    kind: "location",
    markerId
  };
}

export function openPostPreview(post: PostSummary, returnMarkerId: string | null = null): MapPreviewState {
  return {
    kind: "post",
    post,
    returnMarkerId
  };
}

export function closeMapPreview(): MapPreviewState {
  return IDLE_MAP_PREVIEW_STATE;
}

export function hasOpenMapPreview(state: MapPreviewState) {
  return state.kind !== "idle";
}

export function getExpandedPreviewPost(state: MapPreviewState) {
  return state.kind === "post" ? state.post : null;
}

export function getActiveLocationPreviewMarkerId(state: MapPreviewState) {
  if (state.kind === "location") {
    return state.markerId;
  }

  if (state.kind === "post") {
    return state.returnMarkerId;
  }

  return null;
}

export function canReturnToLocationPreview(
  state: MapPreviewState
): state is Extract<MapPreviewState, { kind: "post" }> & { returnMarkerId: string } {
  return state.kind === "post" && state.returnMarkerId !== null;
}

export function backFromPostPreview(state: MapPreviewState): MapPreviewState {
  if (state.kind !== "post") {
    return state;
  }

  if (state.returnMarkerId) {
    return openLocationPreview(state.returnMarkerId);
  }

  return closeMapPreview();
}

export function findPlaceClusterMarker(markers: MapMarker[], markerId: string) {
  return markers.find((marker): marker is PlaceClusterMarker => marker.type === "placeCluster" && marker.id === markerId) ?? null;
}

function hasStandalonePostMarker(markers: MapMarker[], postId: string) {
  return markers.some((marker) => "post" in marker && marker.post.id === postId);
}

export function syncPreviewStateWithMarkers(state: MapPreviewState, markers: MapMarker[]): MapPreviewState {
  if (state.kind === "idle") {
    return state;
  }

  if (state.kind === "location") {
    return findPlaceClusterMarker(markers, state.markerId) ? state : closeMapPreview();
  }

  if (state.returnMarkerId) {
    const sourceCluster = findPlaceClusterMarker(markers, state.returnMarkerId);

    if (sourceCluster?.posts.some((post) => post.id === state.post.id)) {
      return state;
    }
  }

  if (hasStandalonePostMarker(markers, state.post.id)) {
    return state.returnMarkerId === null ? state : openPostPreview(state.post, null);
  }

  return closeMapPreview();
}
