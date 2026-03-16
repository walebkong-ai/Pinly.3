"use client";

import { useState } from "react";
import Link from "next/link";
import Map, { Marker } from "react-map-gl/maplibre";
import { buildPostLocationMapHref } from "@/lib/map-post-navigation";
import { DEFAULT_MAP_STYLE_URL } from "@/lib/map-style";

const PIN_PATH =
  "M16 2C9.096 2 3.5 7.596 3.5 14.5C3.5 24.508 13.056 33.128 15.192 40.704C15.297 41.079 15.639 41.338 16 41.338C16.361 41.338 16.703 41.079 16.808 40.704C18.944 33.128 28.5 24.508 28.5 14.5C28.5 7.596 22.904 2 16 2Z";

function MiniMapPin() {
  return (
    <div
      style={{
        filter:
          "drop-shadow(0 6px 10px rgba(24,85,56,0.28)) drop-shadow(0 2px 4px rgba(24,85,56,0.18))",
        transform: "translateZ(0)"
      }}
    >
      <svg
        width="30"
        height="41"
        viewBox="0 0 32 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: "block", overflow: "visible" }}
      >
        <path
          d={PIN_PATH}
          fill="#185538"
          stroke="#FFF3E6"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </svg>
      {/* Dot in the pin head */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "6px",
          transform: "translateX(-50%)",
          width: "10px",
          height: "10px",
          borderRadius: "9999px",
          background: "#185538",
          boxShadow: "inset 0 0 0 1px rgba(255,248,240,0.22)"
        }}
      />
    </div>
  );
}

export function PostMiniMap({
  latitude,
  longitude,
  placeName
}: {
  latitude: number;
  longitude: number;
  placeName: string;
}) {
  const [mapError, setMapError] = useState(false);

  const mapHref = buildPostLocationMapHref({
    id: "mini-map",
    latitude,
    longitude
  });

  if (mapError) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[1.4rem] border border-[rgba(56,182,201,0.18)] bg-[rgba(56,182,201,0.06)] text-xs text-[var(--foreground)]/40">
        Map unavailable
      </div>
    );
  }

  return (
    <Link
      href={mapHref}
      scroll={false}
      aria-label={`View ${placeName} on the map`}
      className="relative block h-44 overflow-hidden rounded-[1.4rem] border border-[rgba(56,182,201,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--map-accent)]/40"
    >
      <Map
        initialViewState={{
          longitude,
          latitude,
          zoom: 12
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={DEFAULT_MAP_STYLE_URL}
        /* Disable all interaction for a static preview */
        scrollZoom={false}
        boxZoom={false}
        dragRotate={false}
        dragPan={false}
        keyboard={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        touchPitch={false}
        interactive={false}
        attributionControl={false}
        onError={() => setMapError(true)}
      >
        <Marker longitude={longitude} latitude={latitude} anchor="bottom">
          <MiniMapPin />
        </Marker>
      </Map>

      {/* Tap-to-open overlay hint */}
      <div className="pointer-events-none absolute bottom-2.5 right-3 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground)]/58 shadow-sm backdrop-blur-sm">
        Open map
      </div>
    </Link>
  );
}
