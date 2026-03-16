"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, Popup, MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import type { MapMarker, MapVisualMode, PostSummary } from "@/types/app";
import { MarkerPreview } from "@/components/map/marker-preview";
import { getMarkerAnchor, getMarkerHtml, getMarkerPopupOffset } from "@/lib/map-marker-rendering";
import {
  DEFAULT_MAP_STYLE_URL,
  SATELLITE_LAYER_ID,
  SATELLITE_SOURCE_ID,
  getMapProjection,
  getSatelliteLayer,
  getSatelliteSource
} from "@/lib/map-style";
import { cn } from "@/lib/utils";

const defaultCenter = {
  longitude: 10,
  latitude: 25,
  zoom: 1.5,
  pitch: 45,
  bearing: 0
};

const satelliteApiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";

const MapMarkers = memo(function MapMarkers({
  markers,
  popupMarkerId,
  selectedPostId,
  mapMode,
  onMarkerClick
}: {
  markers: MapMarker[];
  popupMarkerId: string | null;
  selectedPostId: string | null;
  mapMode: MapVisualMode;
  onMarkerClick: (marker: MapMarker) => void;
}) {
  return (
    <>
      {markers.map((marker) => {
        const isSelected = marker.id === popupMarkerId || ("post" in marker && marker.post.id === selectedPostId);

        return (
          <Marker
            key={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor={getMarkerAnchor(marker)}
            opacityWhenCovered="0"
            subpixelPositioning
            style={isSelected ? { zIndex: 3 } : undefined}
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onMarkerClick(marker);
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: getMarkerHtml(marker, isSelected, mapMode) }}
              className="cursor-pointer leading-none"
            />
          </Marker>
        );
      })}
    </>
  );
});

function setLayerVisibility(mapInstance: ReturnType<MapRef["getMap"]>, layerId: string, visible: boolean) {
  if (!mapInstance.getLayer(layerId)) {
    return;
  }

  const nextVisibility = visible ? "visible" : "none";

  if (mapInstance.getLayoutProperty(layerId, "visibility") !== nextVisibility) {
    mapInstance.setLayoutProperty(layerId, "visibility", nextVisibility);
  }
}

export const MapCanvas = memo(function MapCanvas({
  selectedPostId,
  markers,
  mapMode,
  onExpandPost,
  onMapError,
  onViewportChange
}: {
  markers: MapMarker[];
  mapMode: MapVisualMode;
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
  const [initialRuntimeModeApplied, setInitialRuntimeModeApplied] = useState(false);
  const baseLayerIdsRef = useRef<string[]>([]);
  const suppressProgrammaticViewportReportUntilRef = useRef(0);

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

  const ensureSatelliteRuntimeStyle = useCallback((mapInstance: ReturnType<MapRef["getMap"]>) => {
    const style = mapInstance.getStyle();

    if (!style) {
      return false;
    }

    if (baseLayerIdsRef.current.length === 0) {
      baseLayerIdsRef.current = (style.layers ?? [])
        .map((layer) => layer.id)
        .filter((layerId) => layerId !== SATELLITE_LAYER_ID);
    }

    if (!mapInstance.getSource(SATELLITE_SOURCE_ID)) {
      mapInstance.addSource(SATELLITE_SOURCE_ID, getSatelliteSource(satelliteApiKey));
    }

    if (!mapInstance.getLayer(SATELLITE_LAYER_ID)) {
      mapInstance.addLayer(getSatelliteLayer(), baseLayerIdsRef.current[0]);
    }

    return true;
  }, []);

  const applyMapMode = useCallback(
    (nextMode: MapVisualMode, options?: { suppressViewportReport?: boolean }) => {
      const mapInstance = mapRef.current?.getMap();

      if (!mapInstance || !mapInstance.isStyleLoaded() || !ensureSatelliteRuntimeStyle(mapInstance)) {
        return;
      }

      if (options?.suppressViewportReport) {
        suppressProgrammaticViewportReportUntilRef.current =
          (typeof performance !== "undefined" ? performance.now() : Date.now()) + 400;
      }

      const targetProjection = getMapProjection(nextMode);

      if (mapInstance.getProjection()?.type !== targetProjection.type) {
        mapInstance.setProjection(targetProjection);
      }

      const satelliteVisible = nextMode === "satellite";

      for (const layerId of baseLayerIdsRef.current) {
        setLayerVisibility(mapInstance, layerId, !satelliteVisible);
      }

      setLayerVisibility(mapInstance, SATELLITE_LAYER_ID, satelliteVisible);
    },
    [ensureSatelliteRuntimeStyle]
  );

  useEffect(() => {
    applyMapMode(mapMode, { suppressViewportReport: true });
  }, [applyMapMode, mapMode]);

  const handleMoveEnd = useCallback((event: ViewStateChangeEvent) => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();

    if (!event.originalEvent && now < suppressProgrammaticViewportReportUntilRef.current) {
      return;
    }

    reportViewport();
  }, [reportViewport]);

  const handleMarkerClick = useCallback((marker: MapMarker) => {
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
  }, []);

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

  return (
    <div
      className={cn(
        "pinly-map-canvas absolute inset-0 bg-[var(--background)]",
        mapMode === "satellite" && "pinly-map-canvas--satellite",
        !initialRuntimeModeApplied && "invisible"
      )}
    >
      <Map
        ref={mapRef}
        initialViewState={defaultCenter}
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
        onLoad={() => {
          applyMapMode(mapMode, { suppressViewportReport: true });
          setInitialRuntimeModeApplied(true);
          window.requestAnimationFrame(() => {
            reportViewport();
          });
        }}
        onError={(event) => {
          if (event.error) {
            onMapError(event.error);
          }
        }}
        onMoveEnd={handleMoveEnd}
        onClick={(e) => {
          // Explicitly prevent bubbling to ensure blank map taps never trigger undocumented layout/global hooks
          e.originalEvent.stopPropagation();
        }}
        mapStyle={DEFAULT_MAP_STYLE_URL}
        interactiveLayerIds={[]}
        minZoom={1}
        maxPitch={85}
      >
        <MapMarkers
          markers={markers}
          popupMarkerId={popupInfo?.id ?? null}
          selectedPostId={selectedPostId}
          mapMode={mapMode}
          onMarkerClick={handleMarkerClick}
        />

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
});
