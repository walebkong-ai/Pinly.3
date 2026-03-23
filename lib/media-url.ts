const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";
const SUPABASE_HOST_SUFFIX = ".supabase.co";
const LOCAL_MEDIA_PATH_PREFIX = "/uploads/";

const ALLOWED_EXTERNAL_AVATAR_HOSTNAMES = new Set([
  "api.dicebear.com",
  "lh3.googleusercontent.com"
]);

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizeRelativePath(value: string) {
  if (!value.startsWith(LOCAL_MEDIA_PATH_PREFIX) || value.includes("..") || value.includes("?") || value.includes("#")) {
    return null;
  }

  return value;
}

function normalizeHttpsUrl(value: string) {
  const parsed = parseUrl(value);

  if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password) {
    return null;
  }

  parsed.hash = "";
  return parsed;
}

export function isAllowedBlobHostname(hostname: string) {
  return hostname === "public.blob.vercel-storage.com" || hostname.endsWith(BLOB_HOST_SUFFIX);
}

export function isAllowedSupabaseHostname(hostname: string) {
  return hostname.endsWith(SUPABASE_HOST_SUFFIX);
}

export function isAllowedMediaHostname(hostname: string) {
  return isAllowedBlobHostname(hostname) || isAllowedSupabaseHostname(hostname);
}

export function isAllowedLocalMediaPath(value: string | null | undefined): value is string {
  return typeof value === "string" && normalizeRelativePath(value) !== null;
}

export function normalizeStoredMediaUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.startsWith("/")) {
    return normalizeRelativePath(value);
  }

  const parsed = normalizeHttpsUrl(value);

  if (!parsed || !isAllowedMediaHostname(parsed.hostname)) {
    return null;
  }

  return parsed.toString();
}

export function normalizeProfileImageUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedStoredMediaUrl = normalizeStoredMediaUrl(value);

  if (normalizedStoredMediaUrl) {
    return normalizedStoredMediaUrl;
  }

  const parsed = normalizeHttpsUrl(value);

  if (!parsed || !ALLOWED_EXTERNAL_AVATAR_HOSTNAMES.has(parsed.hostname)) {
    return null;
  }

  return parsed.toString();
}

export function shouldProxyMediaUrl(value: string | null | undefined) {
  if (!value || value.startsWith("/")) {
    return false;
  }

  const parsed = normalizeHttpsUrl(value);

  if (!parsed) {
    return false;
  }

  // Supabase public CDN URLs are served directly — no proxy needed
  if (isAllowedSupabaseHostname(parsed.hostname)) {
    return false;
  }

  // Vercel Blob private URLs need proxying through /api/media for auth
  return isAllowedBlobHostname(parsed.hostname);
}
