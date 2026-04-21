const serviceWorkerUrl = new URL(self.location.href);
const SERVICE_WORKER_VERSION = serviceWorkerUrl.searchParams.get("v") || "pinly-sw";
const CACHE_PREFIX = "pinly-runtime";
const CACHE_NAME = `${CACHE_PREFIX}-${SERVICE_WORKER_VERSION}`;
const STATIC_ASSET_PATHS = new Set([
  "/manifest.webmanifest",
  "/logo.png",
  "/pinly-globe-icon.svg"
]);
const STATIC_ASSET_PREFIXES = ["/_next/static/", "/demo-media/"];

function isCacheableStaticAsset(request, url) {
  if (request.method !== "GET") {
    return false;
  }

  if (url.origin !== self.location.origin) {
    return false;
  }

  if (request.headers.has("authorization")) {
    return false;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
    return false;
  }

  return (
    STATIC_ASSET_PATHS.has(url.pathname) ||
    STATIC_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

async function clearOutdatedCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName !== CACHE_NAME)
      .map((cacheName) => caches.delete(cacheName))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await caches.open(CACHE_NAME);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await clearOutdatedCaches();
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "PINLY_SKIP_WAITING") {
    void self.skipWaiting();
    return;
  }

  if (event.data?.type === "PINLY_CLEAR_CACHES") {
    void clearOutdatedCaches();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (!isCacheableStaticAsset(request, url)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        void fetch(request)
          .then((response) => {
            if (response.ok) {
              return cache.put(request, response.clone());
            }
          })
          .catch(() => {});

        return cachedResponse;
      }

      const response = await fetch(request);

      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    })().catch(() => {
      return new Response("Static asset unavailable while offline.", {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    })
  );
});
