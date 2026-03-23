import crypto from "node:crypto";
import {
  buildSupabasePublicMediaUrl,
  createSupabaseUploadClient,
  getSupabasePublicBaseUrl,
  getSupabaseUploadKey,
  getSupabaseStorageBucket
} from "@/lib/supabase-storage";

const DEFAULT_UPLOAD_LIMIT_MB = 4;

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

export type StorageDriver = "supabase";

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}

function getSupabaseUploadConfigurationError() {
  try {
    getSupabasePublicBaseUrl();
    getSupabaseUploadKey();
    getSupabaseStorageBucket();
    return null;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }

    return new Error("Supabase media storage is misconfigured.");
  }
}

function shouldUseEmbeddedDevelopmentUploads() {
  return process.env.NODE_ENV !== "production" && getSupabaseUploadConfigurationError() !== null;
}

function normalizeUploadExtension(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() ?? "bin" : "bin";
  return extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}

function normalizeObjectPathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "file";
}

export function getStorageDriver(): StorageDriver {
  const configuredValue = (process.env.STORAGE_DRIVER ?? "supabase").trim().toLowerCase();

  if (
    !configuredValue ||
    configuredValue === "supabase" ||
    configuredValue === "local" ||
    configuredValue === "blob" ||
    configuredValue === "vercel-blob" ||
    configuredValue === "vercel_blob"
  ) {
    return "supabase";
  }

  throw new StorageConfigError("Pinly only supports Supabase storage. Remove legacy STORAGE_DRIVER overrides.");
}

export function getMaxUploadSizeBytes() {
  const fallback = DEFAULT_UPLOAD_LIMIT_MB;
  const megabytes = Number(process.env.MAX_UPLOAD_SIZE_MB ?? String(fallback));

  if (!Number.isFinite(megabytes) || megabytes <= 0) {
    throw new StorageConfigError("MAX_UPLOAD_SIZE_MB must be set to a positive number.");
  }

  return megabytes * 1024 * 1024;
}

export function assertStorageConfiguration() {
  getStorageDriver();
  const configurationError = getSupabaseUploadConfigurationError();

  if (!configurationError) {
    return;
  }

  if (shouldUseEmbeddedDevelopmentUploads()) {
    return;
  }

  try {
    throw configurationError;
  } catch (error) {
    if (error instanceof Error) {
      throw new StorageConfigError(error.message);
    }

    throw new StorageConfigError("Supabase media storage is misconfigured.");
  }
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

export async function saveFileToSupabase(file: File, options?: { ownerId?: string }) {
  assertStorageConfiguration();
  inferMediaType(file);

  const extension = normalizeUploadExtension(file);
  const ownerSegment = options?.ownerId ? normalizeObjectPathSegment(options.ownerId) : "shared";
  const objectPath = `${ownerSegment}/${crypto.randomUUID()}.${extension}`;
  const bucket = getSupabaseStorageBucket();
  const supabase = createSupabaseUploadClient();
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const { error } = await supabase.storage.from(bucket).upload(objectPath, uint8Array, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  return buildSupabasePublicMediaUrl(objectPath, bucket);
}

async function saveEmbeddedDevelopmentUpload(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
}

export async function saveUploadedFile(file: File, options?: { ownerId?: string }) {
  if (shouldUseEmbeddedDevelopmentUploads()) {
    inferMediaType(file);
    return saveEmbeddedDevelopmentUpload(file);
  }

  return saveFileToSupabase(file, options);
}
