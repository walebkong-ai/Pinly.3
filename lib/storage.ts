import { put } from "@vercel/blob";
import crypto from "node:crypto";

const DEFAULT_VERCEL_UPLOAD_LIMIT_MB = 4;

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

export async function saveFileToVercelBlob(file: File) {
  assertStorageConfiguration();
  const extension = normalizeUploadExtension(file);
  const prefix = process.env.BLOB_UPLOAD_PREFIX ?? "posts";
  const pathname = `${prefix}/${crypto.randomUUID()}.${extension}`;
  // Read access mode from env to support private Blob stores, defaulting to public
  const accessMode = process.env.BLOB_ACCESS_MODE || "public";

  const blob = await put(pathname, file, {
    access: accessMode as "public", // typecast to satisfy older SDK typings if needed
    addRandomSuffix: false,
    contentType: file.type || undefined
  });

  return blob.url;
}

export async function saveUploadedFile(file: File) {
  assertStorageConfiguration();
  return saveFileToVercelBlob(file);
}

export function inferMediaType(file: File) {
  if (file.type.startsWith("image/")) {
    return "IMAGE" as const;
  }

  if (file.type.startsWith("video/")) {
    return "VIDEO" as const;
  }

  throw new Error("Unsupported file type");
}
