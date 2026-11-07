const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence"
]);

export const MAX_HEIC_INPUT_BYTES = 20 * 1024 * 1024;

export function isHeicFile(file: Pick<File, "name" | "type">) {
  return HEIC_MIME_TYPES.has(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name);
}

export function isHeicUrl(value: string) {
  try {
    return /\.hei[cf]$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}
