"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { MapMarker, PostSummary } from "@/types/app";
import { MarkerPreview } from "@/components/map/marker-preview";

const defaultCenter: [number, number] = [25, 10];
const defaultZoom = 2;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeImageUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return escapeHtml(value);
  }

  return null;
}

const cityClusterIcon = (count: number) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;min-width:56px;align-items:center;justify-content:center;padding:0 14px;height:44px;border-radius:9999px;background:rgba(29,43,38,0.92);color:white;border:4px solid rgba(255,255,255,0.92);font-size:12px;font-weight:700;box-shadow:0 18px 30px rgba(29,43,38,0.18)">${count}</div>`,
    iconSize: [56, 44],
    iconAnchor: [28, 22]
  });

const placeClusterIcon = (count: number) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9999px;background:rgba(15,118,110,0.94);color:white;border:4px solid rgba(255,255,255,0.95);font-size:12px;font-weight:700;box-shadow:0 12px 24px rgba(15,118,110,0.2)">${count}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });

const pinIcon = (selected = false) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 22 : 18}px;height:${selected ? 22 : 18}px;border-radius:9999px;background:${selected ? "#cf8b43" : "#0f766e"};border:3px solid white;box-shadow:0 10px 20px rgba(15,118,110,0.28)"></div>`,
    iconSize: [selected ? 22 : 18, selected ? 22 : 18],
    iconAnchor: [selected ? 11 : 9, selected ? 11 : 9]
  });

const bubbleIcon = ({
  name,
  avatarUrl,
  selected
}: {
  name: string;
  avatarUrl?: string | null;
  selected: boolean;
}) =>
  L.divIcon({
    className: "",
    html: (() => {
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
    })(),
    iconSize: [selected ? 44 : 38, selected ? 44 : 38],
    iconAnchor: [selected ? 22 : 19, selected ? 22 : 19]
  });

function ViewportBridge({
  onViewportChange
}: {
  onViewportChange: (viewport: {
    bounds: { north: number; south: number; east: number; west: number };
    zoom: number;
  }) => void;
}) {
  const map = useMap();

  function reportViewport() {
    const bounds = map.getBounds();
    onViewportChange({
      zoom: map.getZoom(),
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      }
    });
  }

  useEffect(() => {
    reportViewport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useMapEvents({
    moveend() {
      reportViewport();
    },
    zoomend() {
      reportViewport();
    }
  });

  return null;
}

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
  function MarkerLayer() {
    const map = useMap();

    function zoomToMarker(marker: MapMarker) {
      if (marker.type === "cityCluster") {
        map.setView([marker.latitude, marker.longitude], 6, { animate: true });
        return;
      }

      if (marker.type === "placeCluster") {
        map.setView([marker.latitude, marker.longitude], 12, { animate: true });
      }
    }

    return (
      <>
        {markers.map((marker) => {
          const icon =
            marker.type === "cityCluster"
              ? cityClusterIcon(marker.postCount)
              : marker.type === "placeCluster"
                ? placeClusterIcon(marker.postCount)
                : marker.type === "profileBubble"
                  ? bubbleIcon({
                      name: marker.post.user.name,
                      avatarUrl: marker.post.user.avatarUrl,
                      selected: marker.post.id === selectedPostId
                    })
                  : pinIcon(marker.post.id === selectedPostId);

          return (
            <Marker key={marker.id} position={[marker.latitude, marker.longitude]} icon={icon}>
              <Popup className="pinly-popup">
                <MarkerPreview
                  marker={marker}
                  onZoomIn={() => zoomToMarker(marker)}
                  onExpandPost={(post) => onExpandPost(post)}
                />
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  }

  return (
    <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom className="h-full min-h-[60vh] w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <ViewportBridge onViewportChange={onViewportChange} />
      <MarkerLayer />
    </MapContainer>
  );
}
