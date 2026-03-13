"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const defaultCenter: [number, number] = [20, 10];

const pickerIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:#0f766e;border:4px solid white;box-shadow:0 10px 20px rgba(15,118,110,0.28)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function MapClickListener({
  onSelect
}: {
  onSelect: (coordinates: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      });
    }
  });

  return null;
}

function MapFocus({
  position
}: {
  position: { latitude: number; longitude: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!position) {
      return;
    }

    map.setView([position.latitude, position.longitude], Math.max(map.getZoom(), 12), {
      animate: true
    });
  }, [map, position]);

  return null;
}

export function LocationPicker({
  position,
  onSelect
}: {
  position: { latitude: number; longitude: number } | null;
  onSelect: (coordinates: { latitude: number; longitude: number }) => void;
}) {
  return (
    <MapContainer center={defaultCenter} zoom={2} scrollWheelZoom className="h-[320px] w-full rounded-[1.75rem]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <MapClickListener onSelect={onSelect} />
      <MapFocus position={position} />
      {position && <Marker position={[position.latitude, position.longitude]} icon={pickerIcon} />}
    </MapContainer>
  );
}
