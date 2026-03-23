"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type NetworkStatusContextValue = {
  isOnline: boolean;
  lastChangedAt: number;
};

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);
const NETWORK_STATUS_HEALTHCHECK_PATH = "/api/health";

async function resolveConfirmedNetworkStatus(signal?: AbortSignal) {
  if (typeof navigator === "undefined") {
    return true;
  }

  if (navigator.onLine) {
    return true;
  }

  try {
    const response = await fetch(NETWORK_STATUS_HEALTHCHECK_PATH, {
      cache: "no-store",
      headers: {
        "x-pinly-network-check": "1"
      },
      signal
    });

    return response.ok;
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

      const nextStatus = await resolveConfirmedNetworkStatus(controller.signal);

      if (isCancelled || controller.signal.aborted) {
        return;
      }

      updateStatus(nextStatus);
    }

    function handleOnline() {
      updateStatus(true);
    }

    function handleOffline() {
      updateStatus(false);
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

    return () => {
      isCancelled = true;
      activeController?.abort();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
