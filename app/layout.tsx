import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "@/app/globals.css";
import { KeyboardViewportProvider } from "@/components/app/keyboard-viewport-provider";
import { NativeAppBridge } from "@/components/app/native-app-bridge";
import { NetworkStatusProvider } from "@/components/network/network-status-provider";
import { OfflineBanner } from "@/components/network/offline-banner";
import { PwaBoot } from "@/components/pwa/pwa-boot";

export const metadata: Metadata = {
  title: "Pinly",
  description: "A private map-first travel journal shared with friends.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  },
  appleWebApp: {
    capable: true,
    title: "Pinly",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#FCECDA",
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--background)] font-[var(--font-sans)] text-[var(--foreground)] antialiased">
        <KeyboardViewportProvider>
          <NetworkStatusProvider>
            <NativeAppBridge />
            <PwaBoot />
            <OfflineBanner />
            {children}
            <Toaster richColors position="top-center" />
          </NetworkStatusProvider>
        </KeyboardViewportProvider>
      </body>
    </html>
  );
}
