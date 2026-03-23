import {
  buildSupabasePublicMediaUrl,
  createSupabaseUploadClient,
  getSupabasePublicBaseUrl,
  getSupabaseUploadKey,
  getSupabaseStorageBucket
} from "@/lib/supabase-storage";
import crypto from "node:crypto";

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

function normalizeUploadExtension(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() ?? "bin" : "bin";
  return extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}

function normalizeLocalPathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "file";
}

const DEFAULT_UPLOAD_LIMIT_MB = 50;

export function getMaxUploadSizeBytes() {
  const fallback = DEFAULT_UPLOAD_LIMIT_MB;
  const megabytes = Number(process.env.MAX_UPLOAD_SIZE_MB ?? String(fallback));

  if (!Number.isFinite(megabytes) || megabytes <= 0) {
    throw new StorageConfigError("MAX_UPLOAD_SIZE_MB must be set to a positive number.");
  }

  return megabytes * 1024 * 1024;
}

export function getStorageDriver(): StorageDriver {
  return "supabase";
}

export function assertStorageConfiguration() {
  try {
    getSupabasePublicBaseUrl();
    getSupabaseUploadKey();
    getSupabaseStorageBucket();
  } catch (error: any) {
    throw new StorageConfigError(error?.message || "Unknown storage configuration error");
  }
}

export function isOwnedLocalUploadUrl(uploadUrl: string, ownerId: string) {
  return false;
}

export function resolveLocalUploadPath(uploadUrl: string) {
  return null;
}

export function getLocalUploadContentType(uploadUrl: string) {
  return "application/octet-stream";
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
  const ownerSegment = options?.ownerId ? normalizeLocalPathSegment(options.ownerId) : "shared";
  const filename = `${ownerSegment}/${crypto.randomUUID()}.${extension}`;
  const bucket = getSupabaseStorageBucket();
  const supabase = createSupabaseUploadClient();

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const { error } = await supabase.storage.from(bucket).upload(filename, uint8Array, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  return buildSupabasePublicMediaUrl(filename, bucket);
}

export async function saveUploadedFile(file: File, options?: { ownerId?: string }) {
  return saveFileToSupabase(file, options);
}
