/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from "@capacitor/cli";

const FALLBACK_WEB_DIR = "native-shell";

function normalizeServerUrl(rawValue: string | undefined) {
  if (!rawValue) {
    return undefined;
  }

  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return undefined;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    throw new Error(
      "CAPACITOR_SERVER_URL must be a valid http:// or https:// URL. Copy .env.capacitor.example to .env.capacitor before running native sync commands."
    );
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("CAPACITOR_SERVER_URL must start with http:// or https://.");
  }

  return parsedUrl.toString().replace(/\/$/, "");
}

const serverUrl = normalizeServerUrl(process.env.CAPACITOR_SERVER_URL);

const config: CapacitorConfig = {
  appId: "com.pinly.app",
  appName: "Pinly",
  // Pinly does not ship a full static Next.js export for native.
  // This directory is only a committed fallback shell that explains how to
  // finish native setup when CAPACITOR_SERVER_URL is missing or unreachable.
  webDir: FALLBACK_WEB_DIR,

  // In production, the native shell loads from the deployed server.
  // For simulator development, CAPACITOR_SERVER_URL can point at a local
  // Next.js server. For physical devices, use your LAN IP or a deployed URL.
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://")
        }
      }
    : {}),

  ios: {
    contentInset: "always",
    allowsLinkPreview: false,
    backgroundColor: "#FCECDA",
    preferredContentMode: "mobile"
  },

  android: {
    backgroundColor: "#FCECDA",
    allowMixedContent: false
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#FCECDA",
      showSpinner: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#FCECDA"
    },
    FirebaseMessaging: {
      presentationOptions: ["alert", "badge", "sound"]
    }
  }
};

export default config;
