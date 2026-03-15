export type ResolvedCreatePostLocation = {
  placeName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

export function buildLocationDisplayName(place: Pick<ResolvedCreatePostLocation, "placeName" | "city" | "country">) {
  return [place.placeName, place.city, place.country]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
}

export function hasFiniteCoordinates(latitude: number | null, longitude: number | null) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

export function parseCoordinateInput(value: string) {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getGeolocationErrorMessage({
  supported,
  secureContext,
  code
}: {
  supported: boolean;
  secureContext: boolean;
  code?: number;
}) {
  if (!secureContext) {
    return "Current location only works on a secure HTTPS page.";
  }

  if (!supported) {
    return "Your browser or device does not support current location.";
  }

  switch (code) {
    case 1:
      return "Location permission was denied. Allow access in your browser settings and try again.";
    case 2:
      return "Your device could not determine a reliable location. Try again or place the pin manually.";
    case 3:
      return "Getting your location took too long. Try again or place the pin manually.";
    default:
      return "We could not get your current location right now.";
  }
}

export function getReverseLookupErrorMessage(code?: string) {
  switch (code) {
    case "REVERSE_SEARCH_TIMEOUT":
      return "We found your coordinates, but naming the place took too long. Check the place fields before publishing.";
    case "REVERSE_SEARCH_UPSTREAM_ERROR":
    case "REVERSE_SEARCH_FETCH_FAILED":
      return "We found your coordinates, but could not name the place. Check the place fields before publishing.";
    default:
      return "We found your coordinates, but could not confirm the place details. Check the place fields before publishing.";
  }
}

export function serializeVisitedDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(value).toISOString();
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}
