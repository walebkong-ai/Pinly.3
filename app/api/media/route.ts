import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing URL", { status: 400 });
  }

  // Allow local URLs to pass through natively
  if (url.startsWith("/")) {
    return Response.redirect(new URL(url, request.nextUrl.origin), 302);
  }

  // If not configured in private mode, just send a 302 redirect direct to the Vercel CDN URL.
  if (process.env.BLOB_ACCESS_MODE !== "private") {
    return Response.redirect(url, 302);
  }

  try {
    const isVercelBlob = url.includes(".blob.vercel-storage.com");
    const headers = new Headers();
    
    // Pass user's range request for video seeking
    const range = request.headers.get("range");
    if (range) {
      headers.set("range", range);
    }

    if (isVercelBlob && process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel blob private stores require the token as Bearer authorization
      headers.set("authorization", `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`);
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return new Response(`Failed to fetch media: ${response.status}`, { status: response.status });
    }

    // Proxy the response headers back to the client (content-type, cache-control, etc)
    const proxyHeaders = new Headers(response.headers);
    proxyHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers: proxyHeaders,
    });
  } catch (error) {
    console.error("Media proxy error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
