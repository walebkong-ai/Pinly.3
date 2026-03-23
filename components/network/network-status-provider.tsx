"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type NetworkStatusContextValue = {
  isOnline: boolean;
  lastChangedAt: number;
};

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [lastChangedAt, setLastChangedAt] = useState(Date.now());

  useEffect(() => {
    function updateStatus(nextStatus: boolean) {
      setIsOnline(nextStatus);
      setLastChangedAt(Date.now());
    }

    function handleOnline() {
      updateStatus(true);
    }

    function handleOffline() {
      updateStatus(false);
    }

    updateStatus(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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
