import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  normalizeRenderableProfileImageUrl,
  normalizeRenderableStoredMediaUrl
} from "@/lib/media-url";

const loggedResolvedUrls = new Set<string>();

function logResolvedUrl(kind: "media" | "avatar", rawValue: string | null | undefined, resolvedValue: string | null) {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    return;
  }

  const logKey = `${kind}:${rawValue ?? "null"}:${resolvedValue ?? "null"}`;

  if (loggedResolvedUrls.has(logKey)) {
    return;
  }

  loggedResolvedUrls.add(logKey);
  console.info("[media-utils] Resolved render URL", {
    kind,
    rawValue: rawValue ?? null,
    resolvedValue
  });
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const visitDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

export function formatVisitDate(value: string | Date) {
  return visitDateFormatter.format(new Date(value));
}

export function slugifyCity(city: string, country: string) {
  return `${city}-${country}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function parseCitySlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function getMediaProxyUrl(url: string | null | undefined): string {
  const resolvedUrl = normalizeRenderableStoredMediaUrl(url) ?? "";
  logResolvedUrl("media", url, resolvedUrl || null);
  return resolvedUrl;
}

export function getProfileImageUrl(url: string | null | undefined): string {
  const resolvedUrl = normalizeRenderableProfileImageUrl(url) ?? "";
  logResolvedUrl("avatar", url, resolvedUrl || null);
  return resolvedUrl;
}
