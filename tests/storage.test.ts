import { afterEach, describe, expect, test, vi } from "vitest";
import { StorageConfigError, assertStorageConfiguration, getBlobAccessMode, getMaxUploadSizeBytes, getStorageDriver, inferMediaType } from "@/lib/storage";

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

  test("defaults blob uploads to private access", () => {
    process.env = {
      ...originalEnv,
      BLOB_READ_WRITE_TOKEN: "token"
    };

    expect(getBlobAccessMode()).toBe("private");
  });

  test("rejects invalid upload size configuration", () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "local",
      MAX_UPLOAD_SIZE_MB: "0"
    };

    expect(() => getMaxUploadSizeBytes()).toThrow(StorageConfigError);
  });

  test("rejects disallowed upload file extensions", () => {
    const fakeFile = {
      name: "avatar.svg",
      type: "image/svg+xml"
    } as File;

    expect(() => inferMediaType(fakeFile)).toThrow("Unsupported file type");
  });
});
