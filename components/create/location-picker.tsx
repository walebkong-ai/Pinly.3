"use client";

import { useEffect, useRef } from "react";
import Map, { Marker, MapRef } from "react-map-gl/maplibre";

const initialViewState = {
  longitude: 10,
  latitude: 20,
  zoom: 1.5,
  pitch: 45,
  bearing: 0
};

export function LocationPicker({
  position,
  onSelect
}: {
  position: { latitude: number; longitude: number } | null;
  onSelect: (coordinates: { latitude: number; longitude: number }) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    if (position && mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.flyTo({
        center: [position.longitude, position.latitude],
        zoom: Math.max(currentZoom, 12),
        essential: true,
      });
    }
  }, [position]);

  function handleMapClick(event: any) {
    onSelect({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng
    });
  }

  return (
    <div className="h-[320px] w-full overflow-hidden rounded-[1.75rem]">
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        reuseMaps
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
        onClick={handleMapClick}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={[]}
        minZoom={1}
        maxPitch={85}
        projection="globe"
      >
        {position && (
          <Marker
            longitude={position.longitude}
            latitude={position.latitude}
            draggable
            onDragEnd={(e) => {
              onSelect({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
            }}
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-4 border-[var(--background)] bg-[var(--map-accent)] shadow-[0_10px_20px_rgba(56,182,201,0.28)]" />
          </Marker>
        )}
      </Map>
    </div>
  );
}
