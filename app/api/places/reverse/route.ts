import { apiError, apiValidationError } from "@/lib/api";
import { normalizeCountryForStorage } from "@/lib/country-flags";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const reverseSearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180)
});

export async function GET(request: Request) {
  const rateLimitResponse = enforceRateLimit({
    scope: "places-reverse",
    request,
    limit: 60,
    windowMs: 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const parsed = reverseSearchSchema.safeParse({
    lat: searchParams.get("lat"),
    lon: searchParams.get("lon")
  });

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("lat", String(parsed.data.lat));
  nominatimUrl.searchParams.set("lon", String(parsed.data.lon));

  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "Pinly/1.0 (prototype reverse search)"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      return apiError("Reverse search is temporarily unavailable.", 502, {
        code: "REVERSE_SEARCH_UPSTREAM_ERROR"
      });
    }

    const data = await response.json();

    const city =
      data.address?.city ??
      data.address?.town ??
      data.address?.village ??
      data.address?.hamlet ??
      data.address?.suburb ??
      data.address?.borough ??
      data.address?.neighbourhood ??
      data.address?.neighborhood ??
      data.address?.municipality ??
      data.address?.county ??
      data.address?.state_district ??
      data.address?.state ??
      data.address?.region ??
      "";

    const country = normalizeCountryForStorage(
      data.address?.country ?? data.address?.country_code?.toUpperCase() ?? ""
    );
    const placeName = data.name || data.display_name?.split(",")[0] || "Pinned Location";

    return Response.json({
      place: {
        placeName,
        city,
        country
      }
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    return apiError(
      timedOut ? "Reverse search timed out." : "Reverse search is temporarily unavailable.",
      timedOut ? 504 : 502,
      {
        code: timedOut ? "REVERSE_SEARCH_TIMEOUT" : "REVERSE_SEARCH_FETCH_FAILED",
        details: error instanceof Error ? error.message : "Unknown reverse search failure"
      }
    );
  }
}
