import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "@/app/globals.css";
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
  themeColor: "#FCECDA"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-[var(--font-sans)] antialiased">
        <PwaBoot />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
