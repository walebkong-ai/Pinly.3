import { apiError, apiValidationError } from "@/lib/api";
import { placeSearchSchema } from "@/lib/validation";
import type { PlaceSearchResult } from "@/types/app";

export const runtime = "nodejs";

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    country?: string;
  };
};

function normalizePlace(result: NominatimResult): PlaceSearchResult {
  const city =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality ??
    result.address?.county ??
    "";

  const displayName = result.display_name;
  const placeName = result.name || displayName.split(",")[0] || "Selected place";

  return {
    id: String(result.place_id),
    placeName,
    displayName,
    city,
    country: result.address?.country ?? "",
    latitude: Number(result.lat),
    longitude: Number(result.lon)
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = placeSearchSchema.safeParse({
    q: searchParams.get("q")
  });

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("limit", "8");
  nominatimUrl.searchParams.set("q", parsed.data.q);

  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "Pinly/1.0 (prototype place search)"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      return apiError("Place search is temporarily unavailable.", 502, {
        code: "PLACE_SEARCH_UPSTREAM_ERROR"
      });
    }

    const results = (await response.json()) as NominatimResult[];

    return Response.json({
      places: results.map(normalizePlace)
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    return apiError(
      timedOut ? "Place search timed out. Try a shorter query or try again." : "Place search is temporarily unavailable.",
      timedOut ? 504 : 502,
      {
        code: timedOut ? "PLACE_SEARCH_TIMEOUT" : "PLACE_SEARCH_FETCH_FAILED",
        details: error instanceof Error ? error.message : "Unknown place search failure"
      }
    );
  }
}
