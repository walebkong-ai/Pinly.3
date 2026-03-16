"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup, MapRef } from "react-map-gl/maplibre";
import type { MapMarker, MapVisualMode, PostSummary } from "@/types/app";
import { MarkerPreview } from "@/components/map/marker-preview";
import {
  getMarkerAnchor,
  getMarkerHtml,
  getMarkerPopupOffset,
  getMarkerRenderPriority,
  sortMarkersForRender
} from "@/lib/map-marker-rendering";
import type { MapStyleValue } from "@/lib/map-style";
import { cn } from "@/lib/utils";

const defaultCenter = {
  longitude: 10,
  latitude: 25,
  zoom: 1.5,
  pitch: 45,
  bearing: 0
};

export function MapCanvas({
  selectedPostId,
  markers,
  mapMode,
  mapStyle,
  onExpandPost,
  onMapError,
  onViewportChange
}: {
  markers: MapMarker[];
  mapMode: MapVisualMode;
  mapStyle: MapStyleValue;
  selectedPostId: string | null;
  onExpandPost: (post: PostSummary) => void;
  onMapError: (error: Error) => void;
  onViewportChange: (viewport: {
    bounds: { north: number; south: number; east: number; west: number };
    zoom: number;
  }) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
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
    if (selectedPostId) {
      setPopupInfo(null);
    }
  }, [selectedPostId]);

  useEffect(() => {
    if (!popupInfo) {
      return;
    }

    const stillVisible = markers.some((marker) => marker.id === popupInfo.id);

    if (!stillVisible) {
      setPopupInfo(null);
    }
  }, [markers, popupInfo]);

  const handleMoveEnd = useCallback(() => {
    reportViewport();
  }, [reportViewport]);

  const selectedMarkerId = popupInfo?.id ?? markers.find((marker) => "post" in marker && marker.post.id === selectedPostId)?.id ?? null;
  const orderedMarkers = useMemo(
    () => sortMarkersForRender(markers, selectedMarkerId),
    [markers, selectedMarkerId]
  );

  function zoomToMarker(marker: MapMarker) {
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
  }

  return (
    <div
      className={cn(
        "pinly-map-canvas absolute inset-0 bg-[var(--background)]",
        mapMode === "satellite" && "pinly-map-canvas--satellite"
      )}
    >
      <Map
        ref={mapRef}
        initialViewState={defaultCenter}
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
        {orderedMarkers.map((marker) => {
          const isSelected = marker.id === popupInfo?.id || ("post" in marker && marker.post.id === selectedPostId);

          return (
            <Marker
              key={marker.id}
              longitude={marker.longitude}
              latitude={marker.latitude}
              anchor={getMarkerAnchor(marker)}
              opacityWhenCovered="0"
              subpixelPositioning
              style={{ zIndex: getMarkerRenderPriority(marker, isSelected) }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();

                if (mapRef.current) {
                  const currentZoom = mapRef.current.getZoom();
                  let targetZoom = currentZoom;

                  if (marker.type === "cityCluster") targetZoom = Math.max(currentZoom + 2, 6);
                  else if (marker.type === "placeCluster") targetZoom = Math.max(currentZoom + 2, 12);
                  else targetZoom = Math.max(currentZoom + 1, 14);

                  mapRef.current.easeTo({
                    center: [marker.longitude, marker.latitude],
                    zoom: targetZoom,
                    duration: 800
                  });
                }

                setPopupInfo(marker);
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: getMarkerHtml(marker, isSelected, mapMode) }}
                className="cursor-pointer leading-none"
              />
            </Marker>
          );
        })}

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
              onExpandPost={onExpandPost}
              onClosePreview={() => setPopupInfo(null)}
            />
          </Popup>
        )}
      </Map>
    </div>
  );
}
