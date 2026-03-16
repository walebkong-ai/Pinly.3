"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup, MapRef } from "react-map-gl/maplibre";
import type { MapMarker, MapVisualMode, PlaceClusterMarker, PostSummary } from "@/types/app";
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

const MapMarkerNode = memo(
  function MapMarkerNode({
    marker,
    isSelected,
    mapMode,
    onSelect
  }: {
    marker: MapMarker;
    isSelected: boolean;
    mapMode: MapVisualMode;
    onSelect: (marker: MapMarker, event: { originalEvent: MouseEvent }) => void;
  }) {
    return (
      <Marker
        longitude={marker.longitude}
        latitude={marker.latitude}
        anchor={getMarkerAnchor(marker)}
        opacityWhenCovered="0"
        subpixelPositioning
        style={{ zIndex: getMarkerRenderPriority(marker, isSelected) }}
        onClick={(event) => onSelect(marker, event)}
      >
        <div
          dangerouslySetInnerHTML={{ __html: getMarkerHtml(marker, isSelected, mapMode) }}
          className="cursor-pointer leading-none"
        />
      </Marker>
    );
  },
  (prevProps, nextProps) =>
    prevProps.marker === nextProps.marker &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.mapMode === nextProps.mapMode
);

export function MapCanvas({
  expandedPostId,
  focusedCoordinates,
  initialViewState,
  selectedLocationMarkerId,
  markers,
  mapMode,
  mapStyle,
  onExpandPost,
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
  onExpandPost: (post: PostSummary) => void;
  onOpenLocationCluster: (marker: PlaceClusterMarker) => void;
  onMapError: (error: Error) => void;
  onViewportChange: (viewport: {
    bounds: { north: number; south: number; east: number; west: number };
    zoom: number;
  }) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const lastFocusedCoordinateKeyRef = useRef<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<MapMarker | null>(null);

  // Stable callback ref to avoid stale closures
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

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
  }, [focusedCoordinates]);

  const handleMoveEnd = useCallback(() => {
    reportViewport();
  }, [reportViewport]);

  const orderedMarkers = useMemo(() => sortMarkersForRender(markers), [markers]);
  const expandedPostMarkerId = useMemo(
    () =>
      expandedPostId
        ? orderedMarkers.find((marker) => "post" in marker && marker.post.id === expandedPostId)?.id ?? null
        : null,
    [expandedPostId, orderedMarkers]
  );
  const selectedMarkerId = getSelectedMapMarkerId({
    expandedPostMarkerId,
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
          // Explicitly prevent bubbling to ensure blank map taps never trigger undocumented layout/global hooks
          e.originalEvent.stopPropagation();
          setPopupInfo(null);
        }}
        mapStyle={mapStyle}
        interactiveLayerIds={[]}
        minZoom={1}
        maxPitch={85}
        projection="globe"
      >
        {unselectedMarkers.map((marker) => (
          <MapMarkerNode
            key={marker.id}
            marker={marker}
            isSelected={false}
            mapMode={mapMode}
            onSelect={handleMarkerSelect}
          />
        ))}
        {selectedMarker ? (
          <MapMarkerNode
            key={selectedMarker.id}
            marker={selectedMarker}
            isSelected
            mapMode={mapMode}
            onSelect={handleMarkerSelect}
          />
        ) : null}

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
