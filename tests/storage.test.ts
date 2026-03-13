import { afterEach, describe, expect, test, vi } from "vitest";
import { StorageConfigError, assertStorageConfiguration, getMaxUploadSizeBytes, getStorageDriver } from "@/lib/storage";

const originalEnv = { ...process.env };

describe("storage configuration", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  test("prefers vercel blob automatically on Vercel", () => {
    process.env = {
      ...originalEnv,
      VERCEL: "1"
    };

    expect(getStorageDriver()).toBe("vercel-blob");
  });

  test("fails loudly when blob storage is missing its token", () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: ""
    };

    expect(() => assertStorageConfiguration()).toThrow(StorageConfigError);
  });

  test("rejects invalid upload size configuration", () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "local",
      MAX_UPLOAD_SIZE_MB: "0"
    };

    expect(() => getMaxUploadSizeBytes()).toThrow(StorageConfigError);
  });
});
