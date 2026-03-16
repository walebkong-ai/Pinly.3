import type { MapMarker, MapVisualMode } from "@/types/app";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeImageUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return escapeHtml(value);
  }
  return null;
}

function cityClusterHTML(count: number) {
  const size = Math.min(64, Math.max(44, 40 + count * 2));
  return `<div style="display:flex;min-width:${size + 12}px;align-items:center;justify-content:center;padding:0 14px;height:${size}px;border-radius:9999px;background:rgba(24,85,56,0.94);color:#fcecda;border:4px solid rgba(252,236,218,0.94);font-size:${size > 50 ? 14 : 12}px;font-weight:700;box-shadow:0 18px 30px rgba(24,85,56,0.18)">${count}</div>`;
}

function placeClusterHTML(count: number) {
  const size = Math.min(56, Math.max(38, 34 + count * 2));
  return `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(56,182,201,0.96);color:#08343d;border:4px solid rgba(252,236,218,0.95);font-size:${size > 44 ? 14 : 12}px;font-weight:700;box-shadow:0 12px 24px rgba(56,182,201,0.22)">${count}</div>`;
}

function pinHTML({
  selected,
  mapMode
}: {
  selected: boolean;
  mapMode: MapVisualMode;
}) {
  const fill = selected ? "#38B6C9" : "#185538";
  const innerFill = "#FFF8F0";
  const width = selected ? 32 : 28;
  const height = selected ? 44 : 38;
  const shadow =
    mapMode === "satellite"
      ? selected
        ? "drop-shadow(0 16px 20px rgba(3, 14, 22, 0.4)) drop-shadow(0 4px 8px rgba(3, 14, 22, 0.26))"
        : "drop-shadow(0 14px 18px rgba(3, 14, 22, 0.34)) drop-shadow(0 4px 8px rgba(3, 14, 22, 0.22))"
      : selected
        ? "drop-shadow(0 14px 18px rgba(56, 182, 201, 0.26)) drop-shadow(0 4px 8px rgba(24, 85, 56, 0.14))"
        : "drop-shadow(0 12px 16px rgba(24, 85, 56, 0.22)) drop-shadow(0 3px 6px rgba(24, 85, 56, 0.14))";

  return `<div style="display:flex;align-items:flex-end;justify-content:center;width:${width}px;height:${height}px;filter:${shadow};transform:translateZ(0)">
    <svg width="${width}" height="${height}" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block;overflow:visible">
      <path d="M16 2C9.096 2 3.5 7.596 3.5 14.5C3.5 24.508 13.056 33.128 15.192 40.704C15.297 41.079 15.639 41.338 16 41.338C16.361 41.338 16.703 41.079 16.808 40.704C18.944 33.128 28.5 24.508 28.5 14.5C28.5 7.596 22.904 2 16 2Z" fill="${fill}" stroke="#FFF3E6" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="16" cy="14.5" r="${selected ? 5.4 : 5}" fill="${innerFill}" fill-opacity="0.98"/>
      <circle cx="16" cy="14.5" r="${selected ? 2.2 : 2}" fill="${fill}" fill-opacity="0.18"/>
    </svg>
  </div>`;
}

function bubbleHTML({
  name,
  avatarUrl,
  selected
}: {
  name: string;
  avatarUrl?: string | null;
  selected: boolean;
}) {
  const safeName = escapeHtml(name);
  const safeAvatarUrl = sanitizeImageUrl(avatarUrl);
  return `<div style="display:flex;align-items:center;justify-content:center;width:${selected ? 44 : 38}px;height:${
    selected ? 44 : 38
  }px;border-radius:9999px;background:white;border:3px solid ${
    selected ? "#38B6C9" : "rgba(24,85,56,0.82)"
  };box-shadow:0 16px 24px rgba(24,85,56,0.18);overflow:hidden">${
    safeAvatarUrl
      ? `<img src="${safeAvatarUrl}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover" />`
      : `<span style="font-size:12px;font-weight:700;color:#185538">${safeName.slice(0, 2).toUpperCase()}</span>`
  }</div>`;
}

export function getMarkerHtml(marker: MapMarker, isSelected: boolean, mapMode: MapVisualMode) {
  if (marker.type === "cityCluster") {
    return cityClusterHTML(marker.postCount);
  }

  if (marker.type === "placeCluster") {
    return placeClusterHTML(marker.postCount);
  }

  if (marker.type === "profileBubble") {
    return bubbleHTML({
      name: marker.post.user.name,
      avatarUrl: marker.post.user.avatarUrl,
      selected: isSelected
    });
  }

  return pinHTML({ selected: isSelected, mapMode });
}

export function getMarkerAnchor(marker: MapMarker): "bottom" | "center" {
  return marker.type === "pin" ? "bottom" : "center";
}

export function getMarkerPopupOffset(marker: MapMarker) {
  if (marker.type === "pin") {
    return 30;
  }

  if (marker.type === "cityCluster") {
    return 26;
  }

  if (marker.type === "profileBubble") {
    return 24;
  }

  return 22;
}
