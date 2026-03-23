"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/native-platform";

export function PwaBoot() {
  useEffect(() => {
    if (isNativePlatform() || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures so the app still loads normally.
    });
  }, []);

  return null;
}
