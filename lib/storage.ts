import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_UPLOAD_DIR = "public/uploads";
const DEFAULT_VERCEL_UPLOAD_LIMIT_MB = 4;

export type StorageDriver = "local" | "vercel-blob";

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
  if (process.env.STORAGE_DRIVER === "local" || process.env.STORAGE_DRIVER === "vercel-blob") {
    return process.env.STORAGE_DRIVER;
  }

  return process.env.VERCEL ? "vercel-blob" : "local";
}

export function getMaxUploadSizeBytes() {
  const fallback = getStorageDriver() === "vercel-blob" ? DEFAULT_VERCEL_UPLOAD_LIMIT_MB : 25;
  const megabytes = Number(process.env.MAX_UPLOAD_SIZE_MB ?? String(fallback));

  if (!Number.isFinite(megabytes) || megabytes <= 0) {
    throw new StorageConfigError("MAX_UPLOAD_SIZE_MB must be set to a positive number.");
  }

  return megabytes * 1024 * 1024;
}

export function assertStorageConfiguration() {
  const driver = getStorageDriver();

  if (driver === "vercel-blob" && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new StorageConfigError("STORAGE_DRIVER=vercel-blob requires BLOB_READ_WRITE_TOKEN.");
  }

  if (driver === "local" && process.env.VERCEL) {
    throw new StorageConfigError("STORAGE_DRIVER=local is not supported on Vercel. Use STORAGE_DRIVER=vercel-blob.");
  }

  const uploadDir = process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR;

  if (driver === "local" && !uploadDir.startsWith("public/")) {
    throw new StorageConfigError("UPLOAD_DIR must stay inside public/ when using local uploads.");
  }
}

export async function saveFileLocally(file: File) {
  assertStorageConfiguration();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = normalizeUploadExtension(file);
  const filename = `${crypto.randomUUID()}.${extension}`;
  const uploadDir = process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR;
  const absoluteDir = path.join(process.cwd(), uploadDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, filename), buffer);

  return `/${uploadDir.replace(/^public\//, "")}/${filename}`;
}

export async function saveFileToVercelBlob(file: File) {
  assertStorageConfiguration();
  const extension = normalizeUploadExtension(file);
  const prefix = process.env.BLOB_UPLOAD_PREFIX ?? "posts";
  const pathname = `${prefix}/${crypto.randomUUID()}.${extension}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || undefined
  });

  return blob.url;
}

export async function saveUploadedFile(file: File) {
  assertStorageConfiguration();

  if (getStorageDriver() === "vercel-blob") {
    return saveFileToVercelBlob(file);
  }

  return saveFileLocally(file);
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
