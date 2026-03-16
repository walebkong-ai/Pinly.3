"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { LoaderCircle, MapPin, Route } from "lucide-react";
import type { CollectionRoutePoint } from "@/types/app";
import { DEFAULT_MAP_STYLE_URL } from "@/lib/map-style";

// Tiny epsilon offset to prevent zero-length segments for same-location memories.
const JITTER = 0.000035;

function jitterDuplicates(points: CollectionRoutePoint[]): CollectionRoutePoint[] {
  const seen: Record<string, number> = {};
  return points.map((pt) => {
    const key = `${pt.latitude.toFixed(6)},${pt.longitude.toFixed(6)}`;
    const count = seen[key] ?? 0;
    seen[key] = count + 1;
    if (count === 0) return pt;
    const angle = (count * 137.5 * Math.PI) / 180; // golden-angle spiral
    return {
      ...pt,
      latitude: pt.latitude + Math.sin(angle) * JITTER * count,
      longitude: pt.longitude + Math.cos(angle) * JITTER * count
    };
  });
}

function getBoundsFromPoints(points: CollectionRoutePoint[]) {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const pt of points) {
    minLat = Math.min(minLat, pt.latitude);
    maxLat = Math.max(maxLat, pt.latitude);
    minLng = Math.min(minLng, pt.longitude);
    maxLng = Math.max(maxLng, pt.longitude);
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function CollectionMapView({
  collectionId,
  color
}: {
  collectionId: string;
  color: string | null;
}) {
  const mapRef = useRef<MapRef>(null);
  const [points, setPoints] = useState<CollectionRoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pinColor = color ?? "#38B6C9";

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);

    fetch(`/api/collections/${collectionId}/route-points`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load route");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setPoints(data.points ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [collectionId]);

  const handleMapLoad = useCallback(() => {
    if (points.length === 0 || !mapRef.current) return;
    const { minLat, maxLat, minLng, maxLng } = getBoundsFromPoints(points);
    const pad = 0.015;
    mapRef.current.fitBounds(
      [
        [minLng - pad, minLat - pad],
        [maxLng + pad, maxLat + pad]
      ],
      { duration: 0, maxZoom: 14 }
    );
  }, [points]);

  // Refit when points arrive after map load
  useEffect(() => {
    if (points.length > 0 && mapRef.current) {
      handleMapLoad();
    }
  }, [points, handleMapLoad]);

  const displayPoints = jitterDuplicates(points);
  const hasRoute = displayPoints.length >= 2;

  const geojson = {
    type: "FeatureCollection" as const,
    features: hasRoute
      ? [
          {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates: displayPoints.map((p) => [p.longitude, p.latitude])
            },
            properties: {}
          }
        ]
      : []
  };

  if (loading) {
    return (
      <div className="flex h-52 items-center justify-center rounded-[1.4rem] border bg-[var(--surface-soft)]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--foreground)]/30" />
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (points.length === 0) {
    return null;
  }

  const initialCenter =
    points.length > 0
      ? { longitude: displayPoints[0]!.longitude, latitude: displayPoints[0]!.latitude, zoom: 10 }
      : { longitude: 0, latitude: 20, zoom: 1 };

  return (
    <div className="overflow-hidden rounded-[1.4rem] border">
      {/* Legend */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: `${pinColor}18` }}
      >
        <Route className="h-3.5 w-3.5 shrink-0" style={{ color: pinColor }} />
        <p className="text-xs font-medium" style={{ color: pinColor }}>
          {points.length} {points.length === 1 ? "memory" : "memories"} • Oldest to newest
        </p>
      </div>

      {/* Map */}
      <div className="h-52 w-full">
        <Map
          ref={mapRef}
          initialViewState={initialCenter}
          mapStyle={DEFAULT_MAP_STYLE_URL}
          onLoad={handleMapLoad}
          attributionControl={false}
          scrollZoom={false}
          dragRotate={false}
          keyboard={false}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Route line */}
          {hasRoute && (
            <Source id="collection-route" type="geojson" data={geojson}>
              {/* Soft shadow beneath the line */}
              <Layer
                id="collection-route-shadow"
                type="line"
                paint={{
                  "line-color": "#000000",
                  "line-width": 5,
                  "line-opacity": 0.08,
                  "line-blur": 3
                }}
                layout={{ "line-cap": "round", "line-join": "round" }}
              />
              {/* Main colored line */}
              <Layer
                id="collection-route-line"
                type="line"
                paint={{
                  "line-color": pinColor,
                  "line-width": 2.5,
                  "line-opacity": 0.82,
                  "line-dasharray": [1.8, 2.2]
                }}
                layout={{ "line-cap": "round", "line-join": "round" }}
              />
            </Source>
          )}

          {/* Memory pins */}
          {displayPoints.map((pt, index) => (
            <Marker
              key={pt.postId}
              longitude={pt.longitude}
              latitude={pt.latitude}
              anchor="bottom"
            >
              <div
                className="relative flex items-center justify-center"
                aria-label={`Memory ${index + 1}`}
              >
                {/* Outer glow */}
                <div
                  className="absolute h-7 w-7 rounded-full opacity-20"
                  style={{ backgroundColor: pinColor }}
                />
                {/* Pin body */}
                <div
                  className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: pinColor }}
                >
                  {/* First/last indicator */}
                  {index === 0 || index === displayPoints.length - 1 ? (
                    <MapPin className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                {/* Order label for first and last */}
                {displayPoints.length > 1 && (index === 0 || index === displayPoints.length - 1) && (
                  <div
                    className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm"
                    style={{ backgroundColor: pinColor }}
                  >
                    {index === 0 ? "Start" : "End"}
                  </div>
                )}
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}
