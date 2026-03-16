import type { MapMarker, MapVisualMode } from "@/types/app";

const PIN_PATH =
  "M16 2C9.096 2 3.5 7.596 3.5 14.5C3.5 24.508 13.056 33.128 15.192 40.704C15.297 41.079 15.639 41.338 16 41.338C16.361 41.338 16.703 41.079 16.808 40.704C18.944 33.128 28.5 24.508 28.5 14.5C28.5 7.596 22.904 2 16 2Z";
const PIN_VIEWBOX_WIDTH = 32;
const PIN_VIEWBOX_HEIGHT = 44;
const PIN_HEAD_CENTER_Y_RATIO = 14.5 / PIN_VIEWBOX_HEIGHT;

type ShadowTone = "green" | "blue" | "accent";

type MarkerRenderSpec = {
  width: number;
  height: number;
  contentSize: number;
  contentTop: number;
  popupOffset: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  contentBackground: string;
  contentBorder: string;
  contentColor: string;
  shadowTone: ShadowTone;
};

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

function scalePinWidth(height: number) {
  return Math.round((height / PIN_VIEWBOX_HEIGHT) * PIN_VIEWBOX_WIDTH);
}

function getRepresentedMemoryCount(marker: MapMarker) {
  if (marker.type === "cityCluster" || marker.type === "placeCluster") {
    return marker.postCount;
  }

  return 1;
}

function getMemoryScaleBoost(memoryCount: number) {
  if (memoryCount >= 11) {
    return 28;
  }

  if (memoryCount >= 7) {
    return 22;
  }

  if (memoryCount >= 4) {
    return 15;
  }

  if (memoryCount >= 2) {
    return 7;
  }

  return 0;
}

function getShadow(mapMode: MapVisualMode, tone: ShadowTone, selected: boolean) {
  if (mapMode === "satellite") {
    return selected
      ? "drop-shadow(0 18px 24px rgba(3, 14, 22, 0.46)) drop-shadow(0 6px 10px rgba(3, 14, 22, 0.32))"
      : "drop-shadow(0 14px 20px rgba(3, 14, 22, 0.36)) drop-shadow(0 4px 8px rgba(3, 14, 22, 0.24))";
  }

  if (tone === "blue") {
    return selected
      ? "drop-shadow(0 18px 24px rgba(15, 128, 145, 0.3)) drop-shadow(0 6px 10px rgba(8, 52, 61, 0.18))"
      : "drop-shadow(0 14px 18px rgba(56, 182, 201, 0.22)) drop-shadow(0 4px 8px rgba(8, 52, 61, 0.12))";
  }

  if (tone === "accent") {
    return selected
      ? "drop-shadow(0 18px 24px rgba(56, 182, 201, 0.3)) drop-shadow(0 6px 10px rgba(24, 85, 56, 0.16))"
      : "drop-shadow(0 14px 18px rgba(56, 182, 201, 0.2)) drop-shadow(0 4px 8px rgba(24, 85, 56, 0.1))";
  }

  return selected
    ? "drop-shadow(0 18px 24px rgba(24, 85, 56, 0.28)) drop-shadow(0 6px 10px rgba(24, 85, 56, 0.16))"
    : "drop-shadow(0 14px 18px rgba(24, 85, 56, 0.22)) drop-shadow(0 4px 8px rgba(24, 85, 56, 0.12))";
}

function getCountSizeExtra(count: number) {
  const digits = String(count).length;

  if (digits >= 3) {
    return 4;
  }

  if (digits === 2) {
    return 2;
  }

  return 0;
}

function getPinRenderSpec(marker: MapMarker, selected: boolean): MarkerRenderSpec {
  const cityCluster = marker.type === "cityCluster";
  const placeCluster = marker.type === "placeCluster";
  const profileMarker = marker.type === "profileBubble";
  const representedMemoryCount = getRepresentedMemoryCount(marker);
  const memoryScaleBoost = getMemoryScaleBoost(representedMemoryCount);
  const countSizeExtra = cityCluster || placeCluster ? getCountSizeExtra(representedMemoryCount) : 0;

  const height = cityCluster
    ? 50 + memoryScaleBoost + countSizeExtra + (selected ? 4 : 0)
    : placeCluster
      ? 48 + memoryScaleBoost + countSizeExtra + (selected ? 4 : 0)
      : profileMarker
        ? 48 + memoryScaleBoost + (selected ? 4 : 0)
        : 44 + memoryScaleBoost + (selected ? 4 : 0);
  const contentSize = cityCluster || placeCluster || profileMarker
    ? Math.round(height * 0.44)
    : Math.round(height * 0.4);
  const fill = cityCluster
    ? selected
      ? "#236A47"
      : "#185538"
    : placeCluster
      ? selected
        ? "#1691A3"
        : "#38B6C9"
      : selected
        ? "#38B6C9"
        : "#185538";

  return {
    width: scalePinWidth(height),
    height,
    contentSize,
    contentTop: Math.round(height * PIN_HEAD_CENTER_Y_RATIO - contentSize / 2),
    popupOffset: Math.round(height * 0.74),
    fill,
    stroke: selected ? "#FFF8F0" : "#FFF3E6",
    strokeWidth: (selected ? 3 : 2.6) + Math.min(memoryScaleBoost, 28) * 0.025,
    contentBackground: placeCluster && selected ? "#F2FDFF" : "#FFF8F0",
    contentBorder: placeCluster ? "rgba(8, 52, 61, 0.12)" : "rgba(24, 85, 56, 0.12)",
    contentColor: cityCluster
      ? "#185538"
      : placeCluster
        ? "#0B4250"
        : selected
          ? "#0B4250"
          : "#185538",
    shadowTone: placeCluster ? "blue" : selected && !cityCluster ? "accent" : "green"
  };
}

function renderCountContent(count: number, spec: MarkerRenderSpec) {
  const label = escapeHtml(String(count));
  const fontSize = label.length >= 3 ? Math.max(10, spec.contentSize - 12) : Math.max(11, spec.contentSize - 9);

  return `<span style="display:block;font-size:${fontSize}px;font-weight:800;line-height:1;color:${spec.contentColor};letter-spacing:-0.02em;font-variant-numeric:tabular-nums">${label}</span>`;
}

function renderAvatarContent(name: string, avatarUrl: string | null | undefined, spec: MarkerRenderSpec) {
  const safeName = escapeHtml(name);
  const safeAvatarUrl = sanitizeImageUrl(avatarUrl);

  if (safeAvatarUrl) {
    return `<img src="${safeAvatarUrl}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover" />`;
  }

  const initials = escapeHtml(
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "P"
  );
  const fontSize = Math.max(10, spec.contentSize - 8);

  return `<span style="display:block;font-size:${fontSize}px;font-weight:800;line-height:1;color:${spec.contentColor};letter-spacing:-0.01em">${initials}</span>`;
}

function renderDotContent(spec: MarkerRenderSpec) {
  const dotSize = Math.max(6, spec.contentSize - 10);

  return `<span style="display:block;width:${dotSize}px;height:${dotSize}px;border-radius:9999px;background:${spec.fill};box-shadow:0 0 0 1px rgba(255,248,240,0.22)"></span>`;
}

function renderPinMarker(marker: MapMarker, selected: boolean, mapMode: MapVisualMode) {
  const spec = getPinRenderSpec(marker, selected);
  const representedMemoryCount = getRepresentedMemoryCount(marker);
  const content =
    marker.type === "cityCluster" || marker.type === "placeCluster"
      ? renderCountContent(marker.postCount, spec)
      : marker.type === "profileBubble"
        ? renderAvatarContent(marker.post.user.name, marker.post.user.avatarUrl, spec)
        : renderDotContent(spec);
  const contentRing = selected ? ",0 0 0 1.5px rgba(255,248,240,0.28)" : "";

  return `<div data-pin-shell="true" data-marker-type="${marker.type}" data-memory-count="${representedMemoryCount}" style="position:relative;display:block;width:${spec.width}px;height:${spec.height}px;filter:${getShadow(
    mapMode,
    spec.shadowTone,
    selected
  )};transform:translateZ(0);overflow:visible">
    <svg width="${spec.width}" height="${spec.height}" viewBox="0 0 ${PIN_VIEWBOX_WIDTH} ${PIN_VIEWBOX_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block;overflow:visible">
      <path d="${PIN_PATH}" fill="${spec.fill}" stroke="${spec.stroke}" stroke-width="${spec.strokeWidth}" stroke-linejoin="round"/>
    </svg>
    <div style="position:absolute;left:50%;top:${spec.contentTop}px;transform:translateX(-50%);width:${spec.contentSize}px;height:${spec.contentSize}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:${spec.contentBackground};box-shadow:inset 0 0 0 1px ${spec.contentBorder}${contentRing}">
      ${content}
    </div>
  </div>`;
}

export function getMarkerHtml(marker: MapMarker, isSelected: boolean, mapMode: MapVisualMode) {
  return renderPinMarker(marker, isSelected, mapMode);
}

export function getMarkerVisualSize(marker: MapMarker, isSelected = false) {
  const spec = getPinRenderSpec(marker, isSelected);

  return {
    width: spec.width,
    height: spec.height
  };
}

export function getMarkerAnchor(_marker: MapMarker): "bottom" {
  return "bottom";
}

export function getMarkerPopupOffset(marker: MapMarker) {
  return getPinRenderSpec(marker, true).popupOffset;
}
