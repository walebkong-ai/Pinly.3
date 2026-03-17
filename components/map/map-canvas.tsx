"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Popup, Source, type MapRef } from "react-map-gl/maplibre";
import type { MapCollectionFilter, MapMarker, MapVisualMode, PlaceClusterMarker, PostSummary } from "@/types/app";
import { MarkerPreview } from "@/components/map/marker-preview";
import {
  getMarkerAnchor,
  getMarkerHtml,
  getMarkerPopupOffset,
  getMarkerRenderPriority,
  sortMarkersForRender
} from "@/lib/map-marker-rendering";
import { getSelectedMapMarkerId, shouldDismissMapPopup } from "@/lib/map-selection-state";
import type { MapStyleValue } from "@/lib/map-style";
import { cn } from "@/lib/utils";

const defaultCenter = {
  longitude: 10,
  latitude: 25,
  zoom: 1.5,
  pitch: 45,
  bearing: 0
};

// Tiny golden-angle spiral jitter to prevent zero-length route segments
const JITTER = 0.000035;
function jitterRoutePoints(points: { latitude: number; longitude: number }[]) {
  const seen: Record<string, number> = {};
  return points.map((pt) => {
    const key = `${pt.latitude.toFixed(6)},${pt.longitude.toFixed(6)}`;
    const count = seen[key] ?? 0;
    seen[key] = count + 1;
    if (count === 0) return pt;
    const angle = (count * 137.5 * Math.PI) / 180;
    return {
      latitude: pt.latitude + Math.sin(angle) * JITTER * count,
      longitude: pt.longitude + Math.cos(angle) * JITTER * count
    };
  });
}

const MapMarkerNode = memo(
  function MapMarkerNode({
    marker,
    isSelected,
    mapMode,
    colorOverride,
    dimmed,
    onSelect
  }: {
    marker: MapMarker;
    isSelected: boolean;
    mapMode: MapVisualMode;
    colorOverride?: string | null;
    dimmed?: boolean;
    onSelect: (marker: MapMarker, event: { originalEvent: MouseEvent }) => void;
  }) {
    const html = useMemo(() => {
      return getMarkerHtml(marker, isSelected, mapMode, colorOverride ?? null);
    }, [marker, isSelected, mapMode, colorOverride]);

    return (
      <Marker
        longitude={marker.longitude}
        latitude={marker.latitude}
        anchor={getMarkerAnchor(marker)}
        opacityWhenCovered="0"
        subpixelPositioning
        style={{ zIndex: getMarkerRenderPriority(marker, isSelected), opacity: dimmed ? 0.32 : 1 }}
        onClick={(event) => onSelect(marker, event)}
      >
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className="cursor-pointer leading-none transition-opacity"
        />
      </Marker>
    );
  },
  (prevProps, nextProps) =>
    prevProps.marker === nextProps.marker &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.mapMode === nextProps.mapMode &&
    prevProps.colorOverride === nextProps.colorOverride &&
    prevProps.dimmed === nextProps.dimmed
);

/** Extract postIds from a marker to check collection membership */
function getMarkerPostIds(marker: MapMarker): string[] {
  if (marker.type === "pin" || marker.type === "profileBubble") {
    return [marker.post.id];
  }
  if (marker.type === "placeCluster") {
    return marker.posts.map((p) => p.id);
  }
  return [];
}

export function MapCanvas({
  expandedPostId,
  focusedCoordinates,
  initialViewState,
  selectedLocationMarkerId,
  markers,
  mapMode,
  mapStyle,
  collectionFilter,
  collectionFitBoundsTarget,
  onExpandPost,
  onFocusedCoordinatesApplied,
  onOpenLocationCluster,
  onMapError,
  onViewportChange
}: {
  markers: MapMarker[];
  mapMode: MapVisualMode;
  mapStyle: MapStyleValue;
  expandedPostId: string | null;
  focusedCoordinates: { latitude: number; longitude: number; key: string } | null;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  selectedLocationMarkerId: string | null;
  collectionFilter: MapCollectionFilter | null;
  collectionFitBoundsTarget?: {
    key: string;
    points: Array<{ latitude: number; longitude: number }>;
  } | null;
  onExpandPost: (post: PostSummary) => void;
  onFocusedCoordinatesApplied?: (focusKey: string) => void;
  onOpenLocationCluster: (marker: PlaceClusterMarker) => void;
  onMapError: (error: Error) => void;
  onViewportChange: (viewport: {
    bounds: { north: number; south: number; east: number; west: number };
    zoom: number;
  }) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const lastFocusedCoordinateKeyRef = useRef<string | null>(null);
  const lastFitCollectionKeyRef = useRef<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<MapMarker | null>(null);

  // Stable callback ref to avoid stale closures
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const onFocusedCoordinatesAppliedRef = useRef(onFocusedCoordinatesApplied);
  onFocusedCoordinatesAppliedRef.current = onFocusedCoordinatesApplied;

  const reportViewport = useCallback(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
    const bounds = mapInstance.getMap().getBounds();
    onViewportChangeRef.current({
      zoom: mapInstance.getZoom(),
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      }
    });
  }, []);

  // Report bounds on initial load
  useEffect(() => {
    reportViewport();
  }, [reportViewport]);

  useEffect(() => {
    if (
      shouldDismissMapPopup({
        expandedPostId,
        selectedLocationMarkerId
      })
    ) {
      setPopupInfo(null);
    }
  }, [expandedPostId, selectedLocationMarkerId]);

  useEffect(() => {
    if (!popupInfo) {
      return;
    }

    const stillVisible = markers.some((marker) => marker.id === popupInfo.id);

    if (!stillVisible) {
      setPopupInfo(null);
    }
  }, [markers, popupInfo]);

  useEffect(() => {
    if (!focusedCoordinates) {
      lastFocusedCoordinateKeyRef.current = null;
      return;
    }

    if (!mapRef.current || lastFocusedCoordinateKeyRef.current === focusedCoordinates.key) {
      return;
    }

    lastFocusedCoordinateKeyRef.current = focusedCoordinates.key;
    setPopupInfo(null);
    mapRef.current.easeTo({
      center: [focusedCoordinates.longitude, focusedCoordinates.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 13),
      duration: 850
    });
    onFocusedCoordinatesAppliedRef.current?.(focusedCoordinates.key);
  }, [focusedCoordinates]);

  // Fit map bounds to selected collection once — guarded by key ref
  useEffect(() => {
    if (!collectionFitBoundsTarget) {
      lastFitCollectionKeyRef.current = null;
      return;
    }

    if (!mapRef.current || lastFitCollectionKeyRef.current === collectionFitBoundsTarget.key) {
      return;
    }

    lastFitCollectionKeyRef.current = collectionFitBoundsTarget.key;
    const { points } = collectionFitBoundsTarget;

    if (points.length === 1) {
      mapRef.current.easeTo({
        center: [points[0].longitude, points[0].latitude],
        zoom: 12,
        duration: 900
      });
    } else {
      const lats = points.map((p) => p.latitude);
      const lngs = points.map((p) => p.longitude);
      const south = Math.min(...lats);
      const north = Math.max(...lats);
      const west = Math.min(...lngs);
      const east = Math.max(...lngs);
      mapRef.current.fitBounds(
        [west, south, east, north],
        { padding: 80, duration: 900, maxZoom: 14 }
      );
    }
  }, [collectionFitBoundsTarget]);

  const handleMoveEnd = useCallback(() => {
    reportViewport();
  }, [reportViewport]);

  const orderedMarkers = useMemo(() => sortMarkersForRender(markers), [markers]);
  const selectedMarkerId = getSelectedMapMarkerId({
    popupMarkerId: popupInfo?.id ?? null,
    selectedLocationMarkerId
  });
  const selectedMarker = useMemo(
    () => (selectedMarkerId ? orderedMarkers.find((marker) => marker.id === selectedMarkerId) ?? null : null),
    [orderedMarkers, selectedMarkerId]
  );
  const unselectedMarkers = useMemo(
    () => (selectedMarkerId ? orderedMarkers.filter((marker) => marker.id !== selectedMarkerId) : orderedMarkers),
    [orderedMarkers, selectedMarkerId]
  );

  const handleExpandPost = useCallback(
    (post: PostSummary) => {
      setPopupInfo(null);
      onExpandPost(post);
    },
    [onExpandPost]
  );

  const zoomToMarker = useCallback((marker: MapMarker) => {
    if (!mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    if (marker.type === "cityCluster") {
      mapRef.current.easeTo({ center: [marker.longitude, marker.latitude], zoom: Math.max(currentZoom + 2, 7), duration: 800 });
      return;
    }
    if (marker.type === "placeCluster") {
      mapRef.current.easeTo({ center: [marker.longitude, marker.latitude], zoom: Math.max(currentZoom + 2, 13), duration: 800 });
    }
    setPopupInfo(null);
  }, []);

  const handleMarkerSelect = useCallback(
    (marker: MapMarker, event: { originalEvent: MouseEvent }) => {
      event.originalEvent.stopPropagation();

      if (marker.type === "placeCluster") {
        setPopupInfo(null);
        onOpenLocationCluster(marker);
        return;
      }

      if (mapRef.current) {
        const currentZoom = mapRef.current.getZoom();
        let targetZoom = currentZoom;

        if (marker.type === "cityCluster") {
          targetZoom = Math.max(currentZoom + 2, 6);
        } else {
          targetZoom = Math.max(currentZoom + 1, 14);
        }

        mapRef.current.easeTo({
          center: [marker.longitude, marker.latitude],
          zoom: targetZoom,
          duration: 800
        });
      }

      setPopupInfo(marker);
    },
    [onOpenLocationCluster]
  );

  // Build route geojson and jitter guard
  const routeGeojson = useMemo(() => {
    if (!collectionFilter || collectionFilter.routePoints.length < 2) return null;
    const jittered = jitterRoutePoints(collectionFilter.routePoints);
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: jittered.map((p) => [p.longitude, p.latitude])
          },
          properties: {}
        }
      ]
    };
  }, [collectionFilter]);

  // Determine per-marker color override and dim state when collection filter is active
  function getMarkerCollectionState(marker: MapMarker): { colorOverride: string | null; dimmed: boolean } {
    if (!collectionFilter) return { colorOverride: null, dimmed: false };
    const postIds = getMarkerPostIds(marker);
    const isInCollection = postIds.some((id) => collectionFilter.postIds.has(id));
    return {
      colorOverride: isInCollection ? collectionFilter.color : null,
      dimmed: !isInCollection
    };
  }

  return (
    <div
      className={cn(
        "pinly-map-canvas absolute inset-0 z-0 isolate bg-[var(--background)]",
        mapMode === "satellite" && "pinly-map-canvas--satellite"
      )}
    >
      <Map
        ref={mapRef}
        initialViewState={initialViewState ?? defaultCenter}
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
        onError={(event) => {
          if (event.error) {
            onMapError(event.error);
          }
        }}
        onMoveEnd={handleMoveEnd}
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setPopupInfo(null);
        }}
        mapStyle={mapStyle}
        interactiveLayerIds={[]}
        minZoom={1}
        maxPitch={85}
        projection="globe"
      >
        {/* Collection route line */}
        {routeGeojson && collectionFilter && (
          <Source id="collection-route" type="geojson" data={routeGeojson}>
            <Layer
              id="collection-route-shadow"
              type="line"
              paint={{ "line-color": "#000000", "line-width": 6, "line-opacity": 0.07, "line-blur": 4 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
            <Layer
              id="collection-route-line"
              type="line"
              paint={{
                "line-color": collectionFilter.color,
                "line-width": 2.5,
                "line-opacity": 0.8,
                "line-dasharray": [2, 2.5]
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        )}

        {unselectedMarkers.map((marker) => {
          const { colorOverride, dimmed } = getMarkerCollectionState(marker);
          return (
            <MapMarkerNode
              key={marker.id}
              marker={marker}
              isSelected={false}
              mapMode={mapMode}
              colorOverride={colorOverride}
              dimmed={dimmed}
              onSelect={handleMarkerSelect}
            />
          );
        })}
        {selectedMarker ? (() => {
          const { colorOverride } = getMarkerCollectionState(selectedMarker);
          return (
            <MapMarkerNode
              key={selectedMarker.id}
              marker={selectedMarker}
              isSelected
              mapMode={mapMode}
              colorOverride={colorOverride}
              dimmed={false}
              onSelect={handleMarkerSelect}
            />
          );
        })() : null}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            offset={getMarkerPopupOffset(popupInfo)}
            subpixelPositioning
            closeButton={false}
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="pinly-popup-container"
          >
            <MarkerPreview
              marker={popupInfo}
              onZoomIn={() => zoomToMarker(popupInfo)}
              onExpandPost={handleExpandPost}
              onClosePreview={() => setPopupInfo(null)}
            />
          </Popup>
        )}
      </Map>
    </div>
  );
}
