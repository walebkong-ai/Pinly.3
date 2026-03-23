"use client";

import { useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { getNativePlatform, isNativePlatform } from "@/lib/native-platform";

export function NativeAppBridge() {
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    const platform = getNativePlatform();
    const root = document.documentElement;
    root.dataset.platform = platform;
    root.classList.add("pinly-native-shell");

    void StatusBar.setStyle({ style: Style.Dark }).catch(() => {
      // Ignore unsupported platforms and keep the app usable.
    });
    void StatusBar.setBackgroundColor({ color: "#FCECDA" }).catch(() => {
      // Ignore unsupported platforms and keep the app usable.
    });
    void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {
      // Ignore unsupported platforms and keep the app usable.
    });

    const hideSplash = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          void SplashScreen.hide().catch(() => {
            // Ignore plugin timing issues so launch never blocks the app.
          });
        });
      });
    };

    if (document.readyState === "complete") {
      hideSplash();
    } else {
      window.addEventListener("load", hideSplash, { once: true });
    }

    return () => {
      root.classList.remove("pinly-native-shell");
      delete root.dataset.platform;
      window.removeEventListener("load", hideSplash);
    };
  }, []);

  return null;
}
