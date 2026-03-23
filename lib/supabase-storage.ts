import { createClient } from "@supabase/supabase-js";

const SUPABASE_HOST_SUFFIX = ".supabase.co";
const PUBLIC_OBJECT_PATH_PREFIX = "/storage/v1/object/public/";

export class SupabaseMediaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseMediaConfigError";
  }
}

function normalizeHttpsUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return null;
    }

    parsed.hash = "";
    return parsed;
  } catch {
    return null;
  }
}

function normalizeStorageBucket(value: string) {
  const normalized = value.trim();

  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(normalized)) {
    throw new SupabaseMediaConfigError("SUPABASE_STORAGE_BUCKET must be a valid Supabase bucket name.");
  }

  return normalized;
}

export function getSupabasePublicBaseUrl() {
  const candidate = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

  if (!candidate) {
    throw new SupabaseMediaConfigError("Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL for Pinly media.");
  }

  const parsed = normalizeHttpsUrl(candidate);

  if (!parsed || !parsed.hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
    throw new SupabaseMediaConfigError("Pinly media requires an HTTPS Supabase project URL.");
  }

  parsed.pathname = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!serviceRoleKey) {
    throw new SupabaseMediaConfigError("Set SUPABASE_SERVICE_ROLE_KEY for Pinly uploads and cleanup.");
  }

  return serviceRoleKey;
}

export function getSupabaseStorageBucket() {
  return normalizeStorageBucket(process.env.SUPABASE_STORAGE_BUCKET ?? "media");
}

export function createSupabaseAdminClient() {
  return createClient(getSupabasePublicBaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false }
  });
}

function encodePath(pathname: string) {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildSupabasePublicMediaUrl(objectPath: string, bucket = getSupabaseStorageBucket()) {
  return buildSupabasePublicMediaUrlFromBase(getSupabasePublicBaseUrl(), objectPath, bucket);
}

function buildSupabasePublicMediaUrlFromBase(baseUrl: string, objectPath: string, bucket: string) {
  const normalizedPath = objectPath
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");

  if (!normalizedPath) {
    throw new SupabaseMediaConfigError("Supabase media paths must not be empty.");
  }

  return `${baseUrl.replace(/\/$/, "")}${PUBLIC_OBJECT_PATH_PREFIX}${encodeURIComponent(bucket)}/${encodePath(normalizedPath)}`;
}

export function parseSupabasePublicMediaUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = normalizeHttpsUrl(value);

  if (!parsed || parsed.search || !parsed.hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
    return null;
  }

  if (!parsed.pathname.startsWith(PUBLIC_OBJECT_PATH_PREFIX)) {
    return null;
  }

  const pathWithoutPrefix = parsed.pathname.slice(PUBLIC_OBJECT_PATH_PREFIX.length);
  const [bucketSegment, ...encodedSegments] = pathWithoutPrefix.split("/").filter(Boolean);

  if (!bucketSegment || encodedSegments.length === 0) {
    return null;
  }

  const bucket = decodeURIComponent(bucketSegment);
  const objectPath = encodedSegments.map((segment) => decodeURIComponent(segment)).join("/");
  const normalizedUrl = buildSupabasePublicMediaUrlFromBase(parsed.origin, objectPath, bucket);

  return {
    bucket,
    objectPath,
    url: normalizedUrl
  };
}

export async function deleteSupabaseStorageObjects(urls: Array<string | null | undefined>) {
  const groupedPaths = new Map<string, Set<string>>();

  for (const url of urls) {
    const parsed = parseSupabasePublicMediaUrl(url);

    if (!parsed) {
      continue;
    }

    if (!groupedPaths.has(parsed.bucket)) {
      groupedPaths.set(parsed.bucket, new Set());
    }

    groupedPaths.get(parsed.bucket)?.add(parsed.objectPath);
  }

  if (groupedPaths.size === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  for (const [bucket, objectPaths] of groupedPaths.entries()) {
    const { error } = await supabase.storage.from(bucket).remove(Array.from(objectPaths));

    if (error) {
      throw new Error(`Supabase storage delete failed for bucket "${bucket}": ${error.message}`);
    }
  }
}
