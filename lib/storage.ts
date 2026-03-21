import { put } from "@vercel/blob";
import crypto from "node:crypto";

const DEFAULT_VERCEL_UPLOAD_LIMIT_MB = 4;
const DEFAULT_BLOB_ACCESS_MODE = "private";

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

export type StorageDriver = "vercel-blob";

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

export function getStorageDriver(): StorageDriver {
  return "vercel-blob";
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
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new StorageConfigError("STORAGE_DRIVER=vercel-blob requires BLOB_READ_WRITE_TOKEN.");
  }
}

export function getBlobAccessMode() {
  const configuredValue = (process.env.BLOB_ACCESS_MODE ?? DEFAULT_BLOB_ACCESS_MODE).trim().toLowerCase();

  if (configuredValue !== "public" && configuredValue !== "private") {
    throw new StorageConfigError("BLOB_ACCESS_MODE must be either 'public' or 'private'.");
  }

  return configuredValue as "public" | "private";
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

export async function saveUploadedFile(file: File, options?: { ownerId?: string }) {
  assertStorageConfiguration();
  return saveFileToVercelBlob(file, options);
}
