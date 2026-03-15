import { auth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";
import { getSearchTerms, rankBySearch } from "@/lib/search";
import { placeSearchSchema } from "@/lib/validation";
import { buildWantToGoPlaceKey } from "@/lib/want-to-go";
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

function placeDisplayName(place: Pick<PlaceSearchResult, "placeName" | "city" | "country">) {
  return [place.placeName, place.city, place.country].filter(Boolean).join(", ");
}

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const parsed = placeSearchSchema.safeParse({
    q: searchParams.get("q")
  });

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const searchTerms = getSearchTerms(parsed.data.q);
  const wantToGoPlaces =
    session?.user?.id
      ? await prisma.wantToGoPlace
          .findMany({
            where: {
              userId: session.user.id,
              AND: searchTerms.map((term) => ({
                OR: [
                  { placeName: { contains: term, mode: "insensitive" } },
                  { city: { contains: term, mode: "insensitive" } },
                  { country: { contains: term, mode: "insensitive" } }
                ]
              }))
            },
            select: {
              id: true,
              placeName: true,
              city: true,
              country: true,
              latitude: true,
              longitude: true,
              updatedAt: true
            },
            take: 8,
            orderBy: { updatedAt: "desc" }
          })
          .catch((error) => {
            if (isPrismaSchemaNotReadyError(error)) {
              return [];
            }

            throw error;
          })
      : [];
  const localPlaces: PlaceSearchResult[] = wantToGoPlaces.map((place) => ({
    id: `want-to-go:${place.id}`,
    placeName: place.placeName,
    displayName: placeDisplayName(place),
    city: place.city,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude
  }));

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("limit", "12");
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
    const dedupedPlaces = new Map<string, PlaceSearchResult>();

    for (const place of [...localPlaces, ...results.map(normalizePlace)]) {
      const key = buildWantToGoPlaceKey(place);
      if (!dedupedPlaces.has(key)) {
        dedupedPlaces.set(key, place);
      }
    }

    return Response.json({
      places: rankBySearch(
        Array.from(dedupedPlaces.values()),
        parsed.data.q,
        (place) => [
          { value: place.placeName, weight: 4.6 },
          { value: place.city, weight: 3.7 },
          { value: place.country, weight: 3.2 },
          { value: place.displayName, weight: 2.4 }
        ]
      ).slice(0, 10)
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    if (localPlaces.length > 0) {
      return Response.json({
        places: rankBySearch(
          localPlaces,
          parsed.data.q,
          (place) => [
            { value: place.placeName, weight: 4.6 },
            { value: place.city, weight: 3.7 },
            { value: place.country, weight: 3.2 },
            { value: place.displayName, weight: 2.4 }
          ]
        ).slice(0, 10)
      });
    }

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
