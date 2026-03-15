export type WantToGoLocation = {
  placeName?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function normalizeTextPart(value?: string | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildWantToGoPlaceKey(location: WantToGoLocation) {
  const latitude =
    typeof location.latitude === "number" && Number.isFinite(location.latitude)
      ? location.latitude.toFixed(4)
      : "";
  const longitude =
    typeof location.longitude === "number" && Number.isFinite(location.longitude)
      ? location.longitude.toFixed(4)
      : "";

  return [
    normalizeTextPart(location.placeName),
    normalizeTextPart(location.city),
    normalizeTextPart(location.country),
    latitude,
    longitude
  ].join("::");
}
