"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type NetworkStatusContextValue = {
  isOnline: boolean;
  lastChangedAt: number;
};

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);
const NETWORK_STATUS_HEALTHCHECK_PATH = "/api/health";
const NETWORK_STATUS_SYNC_INTERVAL_MS = 15_000;

type ResolveConfirmedNetworkStatusOptions = {
  signal?: AbortSignal;
  navigatorOnline?: boolean;
  fetcher?: typeof fetch | null;
};

export async function resolveConfirmedNetworkStatus(options: ResolveConfirmedNetworkStatusOptions = {}) {
  const navigatorOnline =
    typeof options.navigatorOnline === "boolean"
      ? options.navigatorOnline
      : typeof navigator === "undefined"
        ? true
        : navigator.onLine;
  const fetcher =
    "fetcher" in options ? options.fetcher ?? null : typeof fetch === "function" ? fetch.bind(globalThis) : null;

  if (!fetcher) {
    return navigatorOnline;
  }

  try {
    await fetcher(NETWORK_STATUS_HEALTHCHECK_PATH, {
      cache: "no-store",
      headers: {
        "x-pinly-network-check": "1"
      },
      signal: options.signal
    });
    return true;
  } catch {
    return false;
  }
}

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastChangedAt, setLastChangedAt] = useState(Date.now());
  const isOnlineRef = useRef(true);

  useEffect(() => {
    function updateStatus(nextStatus: boolean) {
      if (isOnlineRef.current === nextStatus) {
        return;
      }

      isOnlineRef.current = nextStatus;
      setIsOnline(nextStatus);
      setLastChangedAt(Date.now());
    }

    let isCancelled = false;
    let activeController: AbortController | null = null;

    async function syncStatus() {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      const nextStatus = await resolveConfirmedNetworkStatus({ signal: controller.signal });

      if (isCancelled || controller.signal.aborted) {
        return;
      }

      updateStatus(nextStatus);
    }

    function handleOnline() {
      void syncStatus();
    }

    function handleOffline() {
      void syncStatus();
    }

    function handleWindowFocus() {
      void syncStatus();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void syncStatus();
      }
    }

    void syncStatus();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const syncInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncStatus();
      }
    }, NETWORK_STATUS_SYNC_INTERVAL_MS);

    return () => {
      isCancelled = true;
      activeController?.abort();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(syncInterval);
    };
  }, []);

  const value = useMemo(
    () => ({
      isOnline,
      lastChangedAt
    }),
    [isOnline, lastChangedAt]
  );

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>;
}

export function useNetworkStatus() {
  const value = useContext(NetworkStatusContext);

  if (!value) {
    throw new Error("useNetworkStatus must be used within a NetworkStatusProvider.");
  }

  return value;
}
