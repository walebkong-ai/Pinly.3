self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Fix 1: NEVER intercept or break image requests
  if (event.request.destination === "image") {
    // User requested logic
    return event.respondWith(fetch(event.request));
  }

  // Fix 2: NEVER interfere with Supabase Storage and uploads
  if (url.hostname.endsWith("supabase.co") || event.request.method === "POST" || url.pathname.startsWith("/api/uploads")) {
    return; // Pass through natively to bypass Safari SW bugs with FormData
  }

  // Fallback for everything else
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response("You are offline.", { status: 503 });
    })
  );
});
