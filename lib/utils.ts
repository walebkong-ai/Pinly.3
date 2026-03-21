import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { shouldProxyMediaUrl } from "@/lib/media-url";

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
  if (!url) return "";
  if (url.startsWith("/")) return url;
  if (shouldProxyMediaUrl(url)) {
    return `/api/media?url=${encodeURIComponent(url)}`;
  }
  return url;
}
