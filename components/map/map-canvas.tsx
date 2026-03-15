"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, Popup, MapRef } from "react-map-gl/maplibre";
import type { MapMarker, PostSummary } from "@/types/app";
import { MarkerPreview } from "@/components/map/marker-preview";

const defaultCenter = {
  longitude: 10,
  latitude: 25,
  zoom: 1.5,
  pitch: 45,
  bearing: 0
};

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

export function MapCanvas({
  selectedPostId,
  markers,
  onExpandPost,
  onViewportChange
}: {
  markers: MapMarker[];
  selectedPostId: string | null;
  onExpandPost: (post: PostSummary) => void;
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
    <div className="absolute inset-0 bg-[var(--background)]">
      <Map
        ref={mapRef}
        initialViewState={defaultCenter}
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
        onMoveEnd={handleMoveEnd}
        onClick={(e) => {
          // Explicitly prevent bubbling to ensure blank map taps never trigger undocumented layout/global hooks
          e.originalEvent.stopPropagation();
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={[]}
        minZoom={1}
        maxPitch={85}
        projection="globe"
      >
        {markers.map((marker) => {
          const isSelected =
            (marker.type === "pin" || marker.type === "profileBubble") &&
            (marker.post.id === selectedPostId || marker.id === popupInfo?.id);
          const html =
            marker.type === "cityCluster"
              ? cityClusterHTML(marker.postCount)
              : marker.type === "placeCluster"
                ? placeClusterHTML(marker.postCount)
                : marker.type === "profileBubble"
                  ? bubbleHTML({
                      name: marker.post.user.name,
                      avatarUrl: marker.post.user.avatarUrl,
                      selected: isSelected
                    })
                  : pinHTML(isSelected);

          return (
            <Marker
              key={marker.id}
              longitude={marker.longitude}
              latitude={marker.latitude}
              anchor="center"
              opacityWhenCovered="0"
              subpixelPositioning
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
              <div dangerouslySetInnerHTML={{ __html: html }} className="cursor-pointer" />
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            offset={20}
            subpixelPositioning
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="pinly-popup-container"
          >
            <MarkerPreview
              marker={popupInfo}
              onZoomIn={() => zoomToMarker(popupInfo)}
              onExpandPost={onExpandPost}
            />
          </Popup>
        )}
      </Map>
    </div>
  );
}
