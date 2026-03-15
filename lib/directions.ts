type DirectionLocation = {
  placeName?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type PlatformInfo = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
};

export type DirectionsProvider = "apple" | "google";

const IOS_DEVICE_REGEX = /iPhone|iPad|iPod/i;

function createLabel(location: DirectionLocation) {
  return [location.placeName, location.city, location.country]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(", ");
}

export function hasValidDirectionsCoordinates(location: DirectionLocation) {
  return (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

export function buildAppleMapsDirectionsUrl(location: DirectionLocation) {
  if (!hasValidDirectionsCoordinates(location)) {
    return null;
  }

  const url = new URL("https://maps.apple.com/");
  url.searchParams.set("daddr", `${location.latitude},${location.longitude}`);

  const label = createLabel(location);

  if (label) {
    url.searchParams.set("q", label);
  }

  return url.toString();
}

export function buildGoogleMapsDirectionsUrl(location: DirectionLocation) {
  if (!hasValidDirectionsCoordinates(location)) {
    return null;
  }

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${location.latitude},${location.longitude}`);

  return url.toString();
}

export function isLikelyIOSDevice({ userAgent = "", platform = "", maxTouchPoints = 0 }: PlatformInfo) {
  return IOS_DEVICE_REGEX.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function getDirectionsProviderOrder(platformInfo: PlatformInfo = {}): DirectionsProvider[] {
  if (isLikelyIOSDevice(platformInfo)) {
    return ["apple", "google"];
  }

  return ["google", "apple"];
}
