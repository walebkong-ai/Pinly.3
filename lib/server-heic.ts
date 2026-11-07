import { MAX_HEIC_INPUT_BYTES } from "@/lib/heic";

// Read incrementally: Content-Length is optional and cannot be trusted on its own.
export async function readHeicResponse(response: Response) {
  if (!response.body) {
    throw new Error("Photo is empty.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;

      if (size > MAX_HEIC_INPUT_BYTES) {
        await reader.cancel();
        throw new Error("HEIC photo exceeds the conversion limit.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, size);
}

export async function convertHeicToJpeg(input: Uint8Array) {
  if (!input.byteLength || input.byteLength > MAX_HEIC_INPUT_BYTES) {
    throw new Error("HEIC photo exceeds the conversion limit or is empty.");
  }

  const { default: convert } = await import("heic-convert");
  const jpeg = await convert({ buffer: input, format: "JPEG", quality: 0.9 });
  return new Uint8Array(jpeg);
}
