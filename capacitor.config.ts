/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.pinly.app",
  appName: "Pinly",
  webDir: "out",

  // In production, the native shell loads from the deployed server.
  // For local development, set CAPACITOR_SERVER_URL to your dev server
  // (e.g. http://192.168.x.x:3000 — use your LAN IP, not localhost).
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
      launchAutoHide: false,
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
