"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, MapRef, ViewStateChangeEvent } from "react-map-gl/maplibre";

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
  const [viewState, setViewState] = useState(initialViewState);

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
        {...viewState}
        onMove={(e: ViewStateChangeEvent) => setViewState(e.viewState)}
        onClick={handleMapClick}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={[]}
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
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0f766e] border-4 border-white shadow-[0_10px_20px_rgba(15,118,110,0.28)]" />
          </Marker>
        )}
      </Map>
    </div>
  );
}
