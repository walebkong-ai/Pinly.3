"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/native-platform";

const PINLY_SERVICE_WORKER_VERSION = "pinly-sw-2026-03-24-security-hardening-1";
const PINLY_SERVICE_WORKER_VERSION_STORAGE_KEY = "pinly:service-worker-version";

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
        void clearedCaches;
        void unregisteredWorkers;
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

    void bootServiceWorker().catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
