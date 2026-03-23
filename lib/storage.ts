import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_VERCEL_UPLOAD_LIMIT_MB = 4;
const DEFAULT_BLOB_ACCESS_MODE = "private";
const localMediaContentTypes = new Map<string, string>([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".mov", "video/quicktime"],
  [".qt", "video/quicktime"]
]);

const uploadMimeTypes = new Map<
  string,
  {
    mediaType: "IMAGE" | "VIDEO";
    extensions: string[];
  }
>([
  ["image/jpeg", { mediaType: "IMAGE", extensions: ["jpg", "jpeg"] }],
  ["image/png", { mediaType: "IMAGE", extensions: ["png"] }],
  ["image/webp", { mediaType: "IMAGE", extensions: ["webp"] }],
  ["image/gif", { mediaType: "IMAGE", extensions: ["gif"] }],
  ["video/mp4", { mediaType: "VIDEO", extensions: ["mp4"] }],
  ["video/webm", { mediaType: "VIDEO", extensions: ["webm"] }],
  ["video/quicktime", { mediaType: "VIDEO", extensions: ["mov", "qt"] }]
]);

export type StorageDriver = "local" | "vercel-blob" | "supabase";

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}

function normalizeUploadExtension(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() ?? "bin" : "bin";
  return extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}

function normalizeBlobPrefix(prefix: string) {
  return prefix
    .split("/")
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");
}

function normalizeLocalPathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "file";
}

export function getStorageDriver(): StorageDriver {
  const configuredValue = (process.env.STORAGE_DRIVER ?? "").trim().toLowerCase();

  if (!configuredValue) {
    // Auto-detect: prefer supabase if env vars present, then vercel-blob, then local
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return "supabase";
    }
    return process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local";
  }

  if (configuredValue === "local" || configuredValue === "vercel-blob" || configuredValue === "supabase") {
    return configuredValue;
  }

  throw new StorageConfigError("STORAGE_DRIVER must be 'local', 'vercel-blob', or 'supabase'.");
}

export function getMaxUploadSizeBytes() {
  const fallback = DEFAULT_VERCEL_UPLOAD_LIMIT_MB;
  const megabytes = Number(process.env.MAX_UPLOAD_SIZE_MB ?? String(fallback));

  if (!Number.isFinite(megabytes) || megabytes <= 0) {
    throw new StorageConfigError("MAX_UPLOAD_SIZE_MB must be set to a positive number.");
  }

  return megabytes * 1024 * 1024;
}

export function assertStorageConfiguration() {
  const driver = getStorageDriver();

  if (driver === "local") {
    getLocalUploadDirectory();
    return;
  }

  if (driver === "vercel-blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new StorageConfigError("STORAGE_DRIVER=vercel-blob requires BLOB_READ_WRITE_TOKEN.");
    }
    return;
  }

  if (driver === "supabase") {
    if (!process.env.SUPABASE_URL) {
      throw new StorageConfigError("STORAGE_DRIVER=supabase requires SUPABASE_URL.");
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new StorageConfigError("STORAGE_DRIVER=supabase requires SUPABASE_SERVICE_ROLE_KEY.");
    }
  }
}

export function getBlobAccessMode() {
  const configuredValue = (process.env.BLOB_ACCESS_MODE ?? DEFAULT_BLOB_ACCESS_MODE).trim().toLowerCase();

  if (configuredValue !== "public" && configuredValue !== "private") {
    throw new StorageConfigError("BLOB_ACCESS_MODE must be either 'public' or 'private'.");
  }

  return configuredValue as "public" | "private";
}

function getLocalUploadDirectory() {
  const configuredPath = (process.env.UPLOAD_DIR ?? "").trim();

  if (!configuredPath) {
    throw new StorageConfigError("STORAGE_DRIVER=local requires UPLOAD_DIR.");
  }

  const absoluteDirectory = path.resolve(process.cwd(), configuredPath);
  const publicDirectory = path.resolve(process.cwd(), "public");
  const relativeToPublic = path.relative(publicDirectory, absoluteDirectory);

  if (!relativeToPublic || relativeToPublic.startsWith("..") || path.isAbsolute(relativeToPublic)) {
    throw new StorageConfigError("UPLOAD_DIR must be a subdirectory inside public/.");
  }

  return {
    absoluteDirectory,
    publicPathPrefix: `/${relativeToPublic.split(path.sep).join("/")}`
  };
}

export function isOwnedLocalUploadUrl(uploadUrl: string, ownerId: string) {
  if (getStorageDriver() !== "local") {
    return false;
  }

  const { publicPathPrefix } = getLocalUploadDirectory();
  const ownerPrefix = `${publicPathPrefix}/${normalizeLocalPathSegment(ownerId)}/`;
  return uploadUrl.startsWith(ownerPrefix);
}

export function resolveLocalUploadPath(uploadUrl: string) {
  if (getStorageDriver() !== "local") {
    return null;
  }

  const { absoluteDirectory, publicPathPrefix } = getLocalUploadDirectory();

  if (!uploadUrl.startsWith(`${publicPathPrefix}/`)) {
    return null;
  }

  const relativePath = uploadUrl.slice(publicPathPrefix.length + 1);

  if (!relativePath) {
    return null;
  }

  const absolutePath = path.resolve(absoluteDirectory, relativePath.split("/").join(path.sep));
  const relativeToUploadRoot = path.relative(absoluteDirectory, absolutePath);

  if (!relativeToUploadRoot || relativeToUploadRoot.startsWith("..") || path.isAbsolute(relativeToUploadRoot)) {
    return null;
  }

  return absolutePath;
}

export function getLocalUploadContentType(uploadUrl: string) {
  return localMediaContentTypes.get(path.extname(uploadUrl).toLowerCase()) ?? "application/octet-stream";
}

export function inferMediaType(file: File) {
  const definition = uploadMimeTypes.get(file.type.toLowerCase());

  if (!definition) {
    throw new Error("Unsupported file type");
  }

  const extension = normalizeUploadExtension(file);

  if (!definition.extensions.includes(extension)) {
    throw new Error("Unsupported file extension");
  }

  return definition.mediaType;
}

export async function saveFileToVercelBlob(file: File, options?: { ownerId?: string }) {
  assertStorageConfiguration();
  inferMediaType(file);
  const extension = normalizeUploadExtension(file);
  const prefix = normalizeBlobPrefix(process.env.BLOB_UPLOAD_PREFIX ?? "posts") || "posts";
  const ownerPrefix = options?.ownerId ? normalizeBlobPrefix(options.ownerId) : null;
  const pathname = [prefix, ownerPrefix, `${crypto.randomUUID()}.${extension}`].filter(Boolean).join("/");
  const accessMode = getBlobAccessMode();

  const blob = await put(pathname, file, {
    access: accessMode as "public",
    addRandomSuffix: false,
    contentType: file.type || undefined
  });

  return blob.url;
}

export async function saveFileToLocalDisk(file: File, options?: { ownerId?: string }) {
  const { absoluteDirectory, publicPathPrefix } = getLocalUploadDirectory();
  inferMediaType(file);

  const extension = normalizeUploadExtension(file);
  const ownerSegment = options?.ownerId ? normalizeLocalPathSegment(options.ownerId) : null;
  const targetDirectory = ownerSegment ? path.join(absoluteDirectory, ownerSegment) : absoluteDirectory;
  const filename = `${crypto.randomUUID()}.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await fs.mkdir(targetDirectory, { recursive: true });
  await fs.writeFile(path.join(targetDirectory, filename), fileBuffer);

  const pathSegments = [publicPathPrefix, ownerSegment, filename].filter(Boolean);
  return pathSegments.join("/");
}

export async function saveFileToSupabase(file: File, options?: { ownerId?: string }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new StorageConfigError("STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  inferMediaType(file);

  const extension = normalizeUploadExtension(file);
  const ownerSegment = options?.ownerId ? normalizeLocalPathSegment(options.ownerId) : "shared";
  const filename = `${ownerSegment}/${crypto.randomUUID()}.${extension}`;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "media";

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const { error } = await supabase.storage.from(bucket).upload(filename, uint8Array, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  // Return the public CDN URL — no auth proxy needed for public buckets
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
}

export async function saveUploadedFile(file: File, options?: { ownerId?: string }) {
  assertStorageConfiguration();
  const driver = getStorageDriver();

  if (driver === "supabase") {
    return saveFileToSupabase(file, options);
  }

  if (driver === "local") {
    return saveFileToLocalDisk(file, options);
  }

  return saveFileToVercelBlob(file, options);
}
