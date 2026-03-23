"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/native-platform";

const PINLY_SERVICE_WORKER_VERSION = "pinly-sw-2026-03-23-media-fix-1";
const PINLY_SERVICE_WORKER_VERSION_STORAGE_KEY = "pinly:service-worker-version";

function maskPublicKey(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (value.length <= 12) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

async function clearBrowserCaches() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return [];
  }

  const cacheNames = await window.caches.keys();
  await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
  return cacheNames;
}

async function unregisterExistingServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  return registrations.length;
}

export function PwaBoot() {
  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    const nextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const nextPublicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    console.info("[runtime] Supabase public runtime configuration", {
      platform: isNativePlatform() ? "native" : "web",
      NEXT_PUBLIC_SUPABASE_URL: nextPublicSupabaseUrl || null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: maskPublicKey(nextPublicSupabaseAnonKey),
      hasNextPublicSupabaseUrl: Boolean(nextPublicSupabaseUrl),
      hasNextPublicSupabaseAnonKey: Boolean(nextPublicSupabaseAnonKey)
    });

    if (!nextPublicSupabaseUrl || !nextPublicSupabaseAnonKey) {
      console.error("[runtime] Missing NEXT_PUBLIC Supabase configuration", {
        hasNextPublicSupabaseUrl: Boolean(nextPublicSupabaseUrl),
        hasNextPublicSupabaseAnonKey: Boolean(nextPublicSupabaseAnonKey)
      });
    }
  }, []);

  useEffect(() => {
    if (isNativePlatform() || !("serviceWorker" in navigator) || process.env.NODE_ENV === "test") {
      return;
    }

    let hasReloadedForControllerChange = false;

    const handleControllerChange = () => {
      if (hasReloadedForControllerChange) {
        return;
      }

      hasReloadedForControllerChange = true;
      window.location.reload();
    };

    async function bootServiceWorker() {
      const previousVersion = window.localStorage.getItem(PINLY_SERVICE_WORKER_VERSION_STORAGE_KEY);

      if (previousVersion !== PINLY_SERVICE_WORKER_VERSION) {
        const [clearedCaches, unregisteredWorkers] = await Promise.all([
          clearBrowserCaches(),
          unregisterExistingServiceWorkers()
        ]);

        console.info("[pwa] Cleared stale offline state before registering service worker", {
          previousVersion,
          nextVersion: PINLY_SERVICE_WORKER_VERSION,
          clearedCaches,
          unregisteredWorkers
        });
      }

      const registration = await navigator.serviceWorker.register(
        `/sw.js?v=${encodeURIComponent(PINLY_SERVICE_WORKER_VERSION)}`,
        {
          scope: "/",
          updateViaCache: "none"
        }
      );

      await registration.update();

      const promoteWaitingWorker = () => {
        registration.waiting?.postMessage({ type: "PINLY_SKIP_WAITING" });
      };

      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", () => {
          if (registration.installing?.state === "installed") {
            promoteWaitingWorker();
          }
        });
      });

      promoteWaitingWorker();
      window.localStorage.setItem(PINLY_SERVICE_WORKER_VERSION_STORAGE_KEY, PINLY_SERVICE_WORKER_VERSION);
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    void bootServiceWorker().catch((error) => {
      console.error("[pwa] Service worker registration failed", error);
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
