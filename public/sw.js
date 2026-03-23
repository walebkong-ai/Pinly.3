const serviceWorkerUrl = new URL(self.location.href);
const SERVICE_WORKER_VERSION = serviceWorkerUrl.searchParams.get("v") || "pinly-sw";
const CACHE_PREFIX = "pinly-runtime";
const CACHE_NAME = `${CACHE_PREFIX}-${SERVICE_WORKER_VERSION}`;

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

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(request).catch(() => {
      return new Response("You are offline.", {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    })
  );
});
