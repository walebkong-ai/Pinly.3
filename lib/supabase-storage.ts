import { createClient } from "@supabase/supabase-js";

const SUPABASE_HOST_SUFFIX = ".supabase.co";
const PUBLIC_OBJECT_PATH_PREFIX = "/storage/v1/object/public/";
const PUBLIC_SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const PUBLIC_SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SERVER_SUPABASE_URL_ENV = "SUPABASE_URL";
const SERVER_SUPABASE_ANON_KEY_ENV = "SUPABASE_ANON_KEY";
const SUPABASE_SERVICE_ROLE_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const SUPABASE_BUCKET_ENV = "SUPABASE_STORAGE_BUCKET";

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

function readEnvValue(name: string) {
  return (process.env[name] ?? "").trim();
}

function maskSecret(value: string) {
  if (!value) {
    return null;
  }

  if (value.length <= 12) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function getTrustedSupabaseOrigins() {
  const origins = new Set<string>();

  for (const candidate of [readEnvValue(SERVER_SUPABASE_URL_ENV), readEnvValue(PUBLIC_SUPABASE_URL_ENV)]) {
    if (!candidate) {
      continue;
    }

    const parsed = normalizeHttpsUrl(candidate);

    if (!parsed || !parsed.hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
      continue;
    }

    parsed.pathname = "";
    parsed.search = "";
    origins.add(parsed.toString().replace(/\/$/, ""));
  }

  return origins;
}

export type SupabaseRuntimeDiagnostics = {
  nextPublicSupabaseUrl: string | null;
  nextPublicSupabaseAnonKey: string | null;
  hasNextPublicSupabaseUrl: boolean;
  hasNextPublicSupabaseAnonKey: boolean;
  hasServerSupabaseUrl: boolean;
  hasServerSupabaseAnonKey: boolean;
  hasSupabaseServiceRoleKey: boolean;
  storageBucket: string | null;
  uploadKeySource: "service_role" | "missing";
};

export function getSupabaseClientPublicBaseUrl() {
  const candidate = readEnvValue(PUBLIC_SUPABASE_URL_ENV);

  if (!candidate) {
    throw new SupabaseMediaConfigError(`Set ${PUBLIC_SUPABASE_URL_ENV} for Pinly public media rendering.`);
  }

  const parsed = normalizeHttpsUrl(candidate);

  if (!parsed || !parsed.hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
    throw new SupabaseMediaConfigError("Pinly public media rendering requires an HTTPS Supabase project URL.");
  }

  parsed.pathname = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

export function getSupabasePublicBaseUrl() {
  const candidate = readEnvValue(SERVER_SUPABASE_URL_ENV) || readEnvValue(PUBLIC_SUPABASE_URL_ENV);

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

export function getSupabasePublicAnonKey() {
  const publicAnonKey = readEnvValue(PUBLIC_SUPABASE_ANON_KEY_ENV) || readEnvValue(SERVER_SUPABASE_ANON_KEY_ENV);

  if (!publicAnonKey) {
    throw new SupabaseMediaConfigError(
      `Set ${PUBLIC_SUPABASE_ANON_KEY_ENV} or ${SERVER_SUPABASE_ANON_KEY_ENV} for Pinly public media runtime.`
    );
  }

  return publicAnonKey;
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = readEnvValue(SUPABASE_SERVICE_ROLE_ENV);

  if (!serviceRoleKey) {
    throw new SupabaseMediaConfigError("Set SUPABASE_SERVICE_ROLE_KEY for Pinly uploads and cleanup.");
  }

  return serviceRoleKey;
}

export function getSupabaseUploadKey() {
  return getSupabaseServiceRoleKey();
}

export function getSupabaseStorageBucket() {
  return normalizeStorageBucket(process.env[SUPABASE_BUCKET_ENV] ?? "media");
}

export function getSupabaseRuntimeDiagnostics(): SupabaseRuntimeDiagnostics {
  const nextPublicSupabaseUrl = readEnvValue(PUBLIC_SUPABASE_URL_ENV);
  const nextPublicSupabaseAnonKey = readEnvValue(PUBLIC_SUPABASE_ANON_KEY_ENV);
  const hasServerSupabaseUrl = Boolean(readEnvValue(SERVER_SUPABASE_URL_ENV));
  const hasServerSupabaseAnonKey = Boolean(readEnvValue(SERVER_SUPABASE_ANON_KEY_ENV));
  const hasSupabaseServiceRoleKey = Boolean(readEnvValue(SUPABASE_SERVICE_ROLE_ENV));

  return {
    nextPublicSupabaseUrl: nextPublicSupabaseUrl || null,
    nextPublicSupabaseAnonKey: maskSecret(nextPublicSupabaseAnonKey),
    hasNextPublicSupabaseUrl: Boolean(nextPublicSupabaseUrl),
    hasNextPublicSupabaseAnonKey: Boolean(nextPublicSupabaseAnonKey),
    hasServerSupabaseUrl,
    hasServerSupabaseAnonKey,
    hasSupabaseServiceRoleKey,
    storageBucket: readEnvValue(SUPABASE_BUCKET_ENV) || "media",
    uploadKeySource: hasSupabaseServiceRoleKey ? "service_role" : "missing"
  };
}

function createSupabaseClient(key: string) {
  return createClient(getSupabasePublicBaseUrl(), key, {
    auth: { persistSession: false }
  });
}

export function createSupabaseAdminClient() {
  return createSupabaseClient(getSupabaseServiceRoleKey());
}

export function createSupabaseUploadClient() {
  return createSupabaseClient(getSupabaseUploadKey());
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

  const trustedOrigins = getTrustedSupabaseOrigins();

  if (trustedOrigins.size > 0 && !trustedOrigins.has(parsed.origin)) {
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
