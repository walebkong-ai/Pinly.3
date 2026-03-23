import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self' capacitor: https:",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://*.supabase.co https://*.public.blob.vercel-storage.com https://api.dicebear.com https://picsum.photos https://fastly.picsum.photos",
      "media-src 'self' data: blob: https://*.supabase.co https://*.public.blob.vercel-storage.com https://interactive-examples.mdn.mozilla.net",
      "font-src 'self' data:",
      "connect-src 'self' capacitor: https://api.maptiler.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://nominatim.openstreetmap.org https://services.arcgisonline.com https://*.supabase.co https://*.public.blob.vercel-storage.com https://api.dicebear.com https://picsum.photos https://fastly.picsum.photos https://interactive-examples.mdn.mozilla.net",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "upgrade-insecure-requests"
    ].join("; ")
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(self), microphone=(), payment=(), usb=()"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  }
];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co"
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com"
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com"
      },
      {
        protocol: "https",
        hostname: "picsum.photos"
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos"
      }
    ]
  }
};

export default nextConfig;
