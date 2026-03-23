import { parseSupabasePublicMediaUrl } from "@/lib/supabase-storage";

const LEGACY_MEDIA_PLACEHOLDER_URL = "/logo.png";
const LEGACY_AVATAR_PLACEHOLDER_URL = "/pinly-globe-icon.svg";
const LEGACY_IMAGE_UPLOAD_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i;

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
  return parseSupabasePublicMediaUrl(value)?.url ?? null;
}

export function normalizeProfileImageUrl(value: string | null | undefined) {
  return normalizeStoredMediaUrl(value);
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
    return LEGACY_MEDIA_PLACEHOLDER_URL;
  }

  if (appPath.startsWith("/uploads/") && LEGACY_IMAGE_UPLOAD_EXTENSION.test(appPath)) {
    return LEGACY_MEDIA_PLACEHOLDER_URL;
  }

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
    return LEGACY_AVATAR_PLACEHOLDER_URL;
  }

  return null;
}

export function isTrustedStoredMediaUrl(value: string | null | undefined): value is string {
  return normalizeStoredMediaUrl(value) !== null;
}
