import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { resolveAuthorizedMediaTarget } from "@/lib/media-authorization";
import { assertStorageConfiguration, getBlobAccessMode, getStorageDriver } from "@/lib/storage";

export const runtime = "nodejs";
const DEFAULT_MEDIA_CACHE_CONTROL = "private, max-age=300, stale-while-revalidate=86400";

const passthroughHeaders = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified"
] as const;

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const requestedUrl = new URL(request.url).searchParams.get("url");

  if (!requestedUrl) {
    return apiError("Missing URL", 400, { code: "MEDIA_URL_MISSING" });
  }

  const target = await resolveAuthorizedMediaTarget(session.user.id, requestedUrl);

  if (!target) {
    return apiError("Media not found", 404, { code: "MEDIA_NOT_FOUND" });
  }

  if (target.kind === "relative") {
    return Response.redirect(new URL(target.url, new URL(request.url).origin), 302);
  }

  const upstreamHeaders = new Headers();
  const range = request.headers.get("range");

  if (range) {
    upstreamHeaders.set("range", range);
  }

  if (getStorageDriver() === "vercel-blob" && getBlobAccessMode() === "private") {
    assertStorageConfiguration();
    upstreamHeaders.set("authorization", `Bearer ${process.env.BLOB_READ_WRITE_TOKEN as string}`);
  }

  try {
    const response = await fetch(target.url, {
      headers: upstreamHeaders,
      cache: "no-store"
    });

    if (!response.ok) {
      return apiError("Failed to fetch media.", response.status, {
        code: "MEDIA_FETCH_FAILED"
      });
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
      return apiError("Unsupported media type.", 415, {
        code: "MEDIA_CONTENT_TYPE_INVALID"
      });
    }

    const responseHeaders = new Headers();

    for (const headerName of passthroughHeaders) {
      const headerValue = response.headers.get(headerName);

      if (headerValue) {
        responseHeaders.set(headerName, headerValue);
      }
    }

    responseHeaders.set("cache-control", response.headers.get("cache-control") ?? DEFAULT_MEDIA_CACHE_CONTROL);
    responseHeaders.set("vary", "Cookie, Range");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error) {
    return apiError("Failed to proxy media.", 502, {
      code: "MEDIA_PROXY_FAILED",
      details: error instanceof Error ? error.message : "Unknown media proxy failure"
    });
  }
}
