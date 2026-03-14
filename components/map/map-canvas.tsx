"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Popup, MapRef, ViewStateChangeEvent } from "react-map-gl/maplibre";
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

const cityClusterHTML = (count: number) =>
  `<div style="display:flex;min-width:56px;align-items:center;justify-content:center;padding:0 14px;height:44px;border-radius:9999px;background:rgba(29,43,38,0.92);color:white;border:4px solid rgba(255,255,255,0.92);font-size:12px;font-weight:700;box-shadow:0 18px 30px rgba(29,43,38,0.18)">${count}</div>`;

const placeClusterHTML = (count: number) =>
  `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9999px;background:rgba(15,118,110,0.94);color:white;border:4px solid rgba(255,255,255,0.95);font-size:12px;font-weight:700;box-shadow:0 12px 24px rgba(15,118,110,0.2)">${count}</div>`;

const pinHTML = (selected = false) =>
  `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 22 : 18}px;height:${selected ? 22 : 18}px;border-radius:9999px;background:${selected ? "#cf8b43" : "#0f766e"};border:3px solid white;box-shadow:0 10px 20px rgba(15,118,110,0.28)"></div>`;

const bubbleHTML = ({ name, avatarUrl, selected }: { name: string; avatarUrl?: string | null; selected: boolean }) => {
  const safeName = escapeHtml(name);
  const safeAvatarUrl = sanitizeImageUrl(avatarUrl);
  return `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 44 : 38}px;height:${
    selected ? 44 : 38
  }px;border-radius:9999px;background:white;border:3px solid ${
    selected ? "#cf8b43" : "rgba(15,118,110,0.85)"
  };box-shadow:0 16px 24px rgba(29,43,38,0.2);overflow:hidden">${
    safeAvatarUrl
      ? `<img src="${safeAvatarUrl}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover" />`
      : `<span style="font-size:12px;font-weight:700;color:#1d2b26">${safeName.slice(0, 2).toUpperCase()}</span>`
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
  const [viewState, setViewState] = useState(defaultCenter);
  const [popupInfo, setPopupInfo] = useState<MapMarker | null>(null);

  // Re-report bounds when map data loads or viewport changes
  useEffect(() => {
    reportViewport(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  function reportViewport(mapInstance: MapRef | null) {
    if (!mapInstance) return;
    const bounds = mapInstance.getMap().getBounds();
    onViewportChange({
      zoom: mapInstance.getZoom(),
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      }
    });
  }

  function handleMoveEnd(e: ViewStateChangeEvent) {
    reportViewport(mapRef.current);
  }

  function zoomToMarker(marker: MapMarker) {
    if (!mapRef.current) return;
    if (marker.type === "cityCluster") {
      mapRef.current.flyTo({ center: [marker.longitude, marker.latitude], zoom: 6 });
      return;
    }
    if (marker.type === "placeCluster") {
      mapRef.current.flyTo({ center: [marker.longitude, marker.latitude], zoom: 12 });
    }
    setPopupInfo(null);
  }

  return (
    <div className="absolute inset-0 bg-[var(--background)]">
      <Map
        ref={mapRef}
        {...viewState}
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
        onMove={(e) => setViewState(e.viewState)}
        onMoveEnd={handleMoveEnd}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={[]}
        minZoom={1}
        maxPitch={85}
        projection="globe"
      >
        {markers.map((marker) => {
          const isSelected =
            (marker.type === "pin" || marker.type === "profileBubble") && marker.post.id === selectedPostId;
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
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(marker);
                if (marker.type === "pin" || marker.type === "profileBubble") {
                  onExpandPost(marker.post);
                }
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
