import { parseSupabasePublicMediaUrl } from "@/lib/supabase-storage";

const LEGACY_MEDIA_PLACEHOLDER_URL = "/logo.png";
const LEGACY_AVATAR_PLACEHOLDER_URL = "/pinly-globe-icon.svg";
const LEGACY_IMAGE_UPLOAD_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i;
const EMBEDDED_MEDIA_DATA_URL_PATTERN =
  /^data:(image\/(?:avif|gif|jpeg|png|webp)|video\/(?:mp4|quicktime|webm));base64,[a-z0-9+/]+=*$/i;
const EMBEDDED_IMAGE_DATA_URL_PATTERN =
  /^data:image\/(?:avif|gif|jpeg|png|webp);base64,[a-z0-9+/]+=*$/i;
const warnedMediaResolutions = new Set<string>();

function warnMediaResolution(kind: "post-media" | "avatar", rawValue: string | null | undefined, resolvedValue: string | null) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const trimmed = rawValue?.trim();

  if (!trimmed) {
    return;
  }

  const warningKey = `${kind}:${trimmed}:${resolvedValue ?? "null"}`;

  if (warnedMediaResolutions.has(warningKey)) {
    return;
  }

  warnedMediaResolutions.add(warningKey);
  console.warn("[media-url] Falling back from a legacy or invalid media value", {
    kind,
    rawValue: trimmed,
    resolvedValue
  });
}

function normalizeAppPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("?") || trimmed.includes("#")) {
    return null;
  }

  return trimmed;
}

export function normalizeStoredMediaUrl(value: string | null | undefined) {
  const normalizedSupabaseUrl = parseSupabasePublicMediaUrl(value)?.url ?? null;

  if (normalizedSupabaseUrl) {
    return normalizedSupabaseUrl;
  }

  const trimmed = value?.trim() ?? "";

  if (EMBEDDED_MEDIA_DATA_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function normalizeProfileImageUrl(value: string | null | undefined) {
  const normalizedSupabaseUrl = parseSupabasePublicMediaUrl(value)?.url ?? null;

  if (normalizedSupabaseUrl) {
    return normalizedSupabaseUrl;
  }

  const trimmed = value?.trim() ?? "";

  if (EMBEDDED_IMAGE_DATA_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function normalizeRenderableStoredMediaUrl(value: string | null | undefined) {
  const normalizedSupabaseUrl = normalizeStoredMediaUrl(value);

  if (normalizedSupabaseUrl) {
    return normalizedSupabaseUrl;
  }

  const appPath = normalizeAppPath(value);

  if (!appPath) {
    return null;
  }

  if (appPath === LEGACY_MEDIA_PLACEHOLDER_URL) {
    warnMediaResolution("post-media", value, LEGACY_MEDIA_PLACEHOLDER_URL);
    return LEGACY_MEDIA_PLACEHOLDER_URL;
  }

  if (appPath.startsWith("/uploads/") && LEGACY_IMAGE_UPLOAD_EXTENSION.test(appPath)) {
    warnMediaResolution("post-media", value, LEGACY_MEDIA_PLACEHOLDER_URL);
    return LEGACY_MEDIA_PLACEHOLDER_URL;
  }

  warnMediaResolution("post-media", value, null);
  return null;
}

export function normalizeRenderableProfileImageUrl(value: string | null | undefined) {
  const normalizedSupabaseUrl = normalizeProfileImageUrl(value);

  if (normalizedSupabaseUrl) {
    return normalizedSupabaseUrl;
  }

  const appPath = normalizeAppPath(value);

  if (!appPath) {
    return null;
  }

  if (appPath === LEGACY_AVATAR_PLACEHOLDER_URL) {
    warnMediaResolution("avatar", value, LEGACY_AVATAR_PLACEHOLDER_URL);
    return LEGACY_AVATAR_PLACEHOLDER_URL;
  }

  warnMediaResolution("avatar", value, null);
  return null;
}

export function isTrustedStoredMediaUrl(value: string | null | undefined): value is string {
  return normalizeStoredMediaUrl(value) !== null;
}
