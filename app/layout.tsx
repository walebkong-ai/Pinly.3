import type { Metadata } from "next";
import { Toaster } from "sonner";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Pinly",
  description: "A private map-first travel journal shared with friends."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-[var(--font-sans)] antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
