"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, Popup, MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import type { MapMarker, MapVisualMode, PostSummary } from "@/types/app";
import { MarkerPreview } from "@/components/map/marker-preview";
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeImageUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return escapeHtml(value);
  }
  return null;
}

const cityClusterHTML = (count: number) => {
  const size = Math.min(64, Math.max(44, 40 + count * 2));
  return `<div style="display:flex;min-width:${size + 12}px;align-items:center;justify-content:center;padding:0 14px;height:${size}px;border-radius:9999px;background:rgba(24,85,56,0.94);color:#fcecda;border:4px solid rgba(252,236,218,0.94);font-size:${size > 50 ? 14 : 12}px;font-weight:700;box-shadow:0 18px 30px rgba(24,85,56,0.18)">${count}</div>`;
};

const placeClusterHTML = (count: number) => {
  const size = Math.min(56, Math.max(38, 34 + count * 2));
  return `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(56,182,201,0.96);color:#08343d;border:4px solid rgba(252,236,218,0.95);font-size:${size > 44 ? 14 : 12}px;font-weight:700;box-shadow:0 12px 24px rgba(56,182,201,0.22)">${count}</div>`;
};

const pinHTML = (selected = false) =>
  `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 22 : 18}px;height:${selected ? 22 : 18}px;border-radius:9999px;background:${selected ? "#38B6C9" : "#185538"};border:3px solid #FCECDA;box-shadow:0 10px 20px ${selected ? "rgba(56,182,201,0.28)" : "rgba(24,85,56,0.22)"}"></div>`;

const bubbleHTML = ({ name, avatarUrl, selected }: { name: string; avatarUrl?: string | null; selected: boolean }) => {
  const safeName = escapeHtml(name);
  const safeAvatarUrl = sanitizeImageUrl(avatarUrl);
  return `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 44 : 38}px;height:${
    selected ? 44 : 38
  }px;border-radius:9999px;background:white;border:3px solid ${
    selected ? "#38B6C9" : "rgba(24,85,56,0.82)"
  };box-shadow:0 16px 24px rgba(24,85,56,0.18);overflow:hidden">${
    safeAvatarUrl
      ? `<img src="${safeAvatarUrl}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover" />`
      : `<span style="font-size:12px;font-weight:700;color:#185538">${safeName.slice(0, 2).toUpperCase()}</span>`
  }</div>`;
};

function getMarkerHtml(marker: MapMarker, isSelected: boolean) {
  if (marker.type === "cityCluster") {
    return cityClusterHTML(marker.postCount);
  }

  if (marker.type === "placeCluster") {
    return placeClusterHTML(marker.postCount);
  }

  if (marker.type === "profileBubble") {
    return bubbleHTML({
      name: marker.post.user.name,
      avatarUrl: marker.post.user.avatarUrl,
      selected: isSelected
    });
  }

  return pinHTML(isSelected);
}

const MapMarkers = memo(function MapMarkers({
  markers,
  popupMarkerId,
  selectedPostId,
  onMarkerClick
}: {
  markers: MapMarker[];
  popupMarkerId: string | null;
  selectedPostId: string | null;
  onMarkerClick: (marker: MapMarker) => void;
}) {
  return (
    <>
      {markers.map((marker) => {
        const isSelected =
          (marker.type === "pin" || marker.type === "profileBubble") &&
          (marker.post.id === selectedPostId || marker.id === popupMarkerId);

        return (
          <Marker
            key={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor="center"
            opacityWhenCovered="0"
            subpixelPositioning
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onMarkerClick(marker);
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: getMarkerHtml(marker, isSelected) }} className="cursor-pointer" />
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
          onMarkerClick={handleMarkerClick}
        />

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            offset={20}
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
